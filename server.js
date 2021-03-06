var httpServerPort = 8080;

var os = require('os');

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;


//var mongo = require('mongoskin');
//var mongoskinstore = require('./mongoskinstore');
//var mongodb = mongo.db('mongodb://admin:' + process.env['ROLLERBOTPASSWORD'] + '@paulo.mongohq.com:10018/rollerbot_test?auto_reconnect', {safe: true});
//var mongoStore = new mongoskinstore({db: mongodb});

var express = require('express');
var app = express();
var http = require('http');


var localIP = require('my-local-ip')();

var fs = require('fs');
var path = require('path');

var defaultBaudRate = process.env['ROLLERBOTBAUDRATE'] || 9600;
defaultBaudRate = +defaultBaudRate;






var webServer = process.env['ROLLERBOTWEBSERVER'] || 'http://intersession-web-server.jit.su:80';








// Array.find polyfill //////////////
if(Array.prototype.find === undefined) {
    Array.prototype.find = function(callback, thisObject) {
        var foundElement;
        thisObject = thisObject || this;
        index = 0;
        while(index < this.length && foundElement === undefined) {
            if(callback(this[index], index, this) === true) {
                foundElement = this[index];
            }
            index += 1;
        }
        return foundElement;
    };
}






















// Websocket //////////////////////////////////////////////
var httpServer = http.createServer(app);

var socketIO = require('socket.io').listen(httpServer);

var webSocket = require('socket.io-client').connect(webServer);

webSocket.on('connect', function () {
    console.log('  Connected to web server at ' + webServer);
    console.log('\n\n');

    giveSocketBluetoothEvents(webSocket);

    webSocket.emit('registerLocalServer', {hostname: os.hostname()});
});






function giveSocketBluetoothEvents(btSocket) {
    btSocket.removeAllListeners();

    btSocket.on('disconnect', function() {

        console.log('Disconnect btSocket.id: ', btSocket.id, ', :');

        var filterToSocket = function(client) { return client.socket.id === btSocket.id; };
        var filterOutSocket = function(client) { return client.socket.id !== btSocket.id; };
        var makeSend = function(spName) {
            return function(toSend) {
                sendOnPort(spName, toSend);
            };
        };

        var spInfo, client;
        flushOnDisconnect(btSocket);
        for (var spName in serialPorts) {
            spInfo = serialPorts[spName];

            client = spInfo.clients.find(filterToSocket);
            if(client) {
                //console.log('client disconnect');
                /*
                if(client.sendOnDisconnect) {
                    client.sendOnDisconnect.forEach( makeSend(localServer, spName) );
                }
                client.sendOnDisconnect = [];
                */
                spInfo.clients = spInfo.clients.filter(filterOutSocket);
                

                if(spInfo.clients.length === 0 && spInfo.isOpen === true) {

                    console.log('  Closing ' + spName + ' from disconnect');
                    spInfo.serialPort.close();
                    spInfo.isOpen = false;
                } else {
                    if(spInfo.clients.length > 0)  console.log('  After disconnect, ' + spName + ' has ' + spInfo.clients.length + ' clients left');
                }
            }
        }
    });


    btSocket.on('unsubscribePort', function(data, clientCallback) {
        console.log('unsubscribePort btSocket.id: ', btSocket.id, ', port: ', data.portName, ': ');
        spInfo = serialPorts[data.portName];
        if(!spInfo) {
            console.log('  unknown port');
            if(clientCallback) clientCallback({err: 'Port \'' + data.portName + '\' unknown'});
        } else {
            spInfo.clients = spInfo.clients.filter(function(client) { return client.socket.id !== btSocket.id; });
            if(spInfo.clients.length === 0) {
                console.log('  length is zero; close if open: ', spInfo.isOpen);
                if(spInfo.isOpen === true) spInfo.serialPort.close();
                spInfo.isOpen = false;
            }
            if(clientCallback) clientCallback({});
        }
    });

    btSocket.on('listPorts', function(data, clientCallback) {
        //console.log('on listPorts');
        serialport.list(function (err, ports) {
            if(err) {
                //console.log('serial port list error: ',err);
                clientCallback({err: err});
            } else {
                ports.sort(function(a, b) {
                    return +(a.comName.replace('COM',''))>+(b.comName.replace('COM',''));
                });
                //console.log(' client callback');
                //console.log(' hostname: ' + os.hostname());
                //console.log('ports ', ports);
                //console.log('ports.map ', ports.map);
                clientCallback({
                    ports: ports.map(function(port) {
                        var isOpen = serialPorts[port.comName] && (serialPorts[port.comName].isOpen === true);
                        return {portName: port.comName, manufacturer: port.manufacturer, isOpen: isOpen};
                    }),
                    hostname: os.hostname()
                });
            }
        });
    });

    btSocket.on('subscribePort', function(data, clientCallback) {
        var portName = data.portName;
        if(portName === undefined || portName === '') {
            console.log('subscribePort: bad port name');
            clientCallback({err: 'bad port name'});
            return;
        }

        console.log('subscribePort, btSocket.id: ', btSocket.id, ', portName: ', portName);
        spInfo = serialPorts[data.portName];

        var subscribe_AfterOpen = function() {
            console.log('  subscribe_AfterOpen');
            spInfo.isOpen = true;
            if(spInfo.clients.filter(function(client) { return client.socket.id === btSocket.id; }).length === 0) {
                console.log('    adding to clients list');
                spInfo.clients.push({socket: btSocket});
            } else {
                console.log('    ...already on clients list?');
            }
            var serialPort = spInfo.serialPort;
            serialPort.on('close', function() {
                console.log('serialPort on close, portName: ', portName);
                //console.log('sp on close, ', portName);
                spInfo.isOpen = false;
                spInfo.clients.forEach(function(client) {
                    client.socket.emit('portClosed', {portName: data.portName});
                });
            });

            serialPort.on('error', function(err) {
                console.log('serialPort on error, portName: "' + portName + '", err: "' + err + '"');
                spInfo.clients.forEach(function(client) {
                    client.socket.emit('portError', {portName: data.portName, err: err});
                });
            });

            //console.log('--- on data');
            serialPort.on('data', function(serialData) {
                console.log('sp ', portName, ' data "', serialData.toString(), '"');
                spInfo.clients.forEach(function(client) {
                    //console.log('  send sp data to client');
                    client.socket.emit('receiveOnPort', {portName: portName, serialData: serialData.toString()});
                });
            });

            clientCallback({});
        };

        if(!spInfo) {
            console.log('  doesn\'t exist, creating');
            spInfo = {};
            serialPorts[data.portName] = spInfo;
            spInfo.isOpen = false;
            spInfo.clients = [];
            console.log('  Opening "' + data.portName + '"');
            spInfo.serialPort = new SerialPort(data.portName, {baudrate: defaultBaudRate, openImmediately: false});

            spInfo.serialPort.open(subscribe_AfterOpen);
        } else if(spInfo.isOpen !== true) {
            console.log('  remove all listeners, then open');
            spInfo.serialPort.removeAllListeners();
            spInfo.serialPort.open(subscribe_AfterOpen);

        } else {
            console.log('  already open');
            //subscribe_AfterOpen();
            if(spInfo.clients.filter(function(client) { return client.socket.id === btSocket.id; }).length === 0) {
                console.log('  adding to clients list');
                spInfo.clients.push({socket: btSocket});
            } else {
                console.log('  already on clients list');
            }
            clientCallback({});
        }

    });

    function sendOnPort(portName, serialData, clientCallback) {
        var spInfo = serialPorts[portName];
        /*
        if(!spInfo) {
            console.log('no spInfo');
            clientCallback({err: 'Port \'' + data.portName + '\' unknown'});
        }
        */
        if (spInfo.isOpen !== true) {
            console.log('not open');
            clientCallback({err: 'Port \'' + portName + '\' is not open'});
        } else {
            console.log('sending');
            spInfo.serialPort.write(serialData);
            console.log('other sent on each client');
            spInfo.clients.forEach(function(client) {
                console.log('  loop client');
                if(client.socket !== btSocket) {
                    console.log('    need to send!');
                    client.socket.emit('otherSent', {
                        portName: portName,
                        serialData: serialData
                    });
                }
            });
            if (clientCallback && typeof clientCallback === 'function') clientCallback();
        }
        

    }

    btSocket.on('sendOnPort', function(data, clientCallback) {
        console.log('sendOnPort', data);
        sendOnPort(data.portName, data.serialData, clientCallback);
    });

    // send and clear all of the sendOnDisconnect messages for a socket
    // this can happen on an actual disconnect or when request by a socket flushOnDisconnect
    function flushOnDisconnect(forSocket) {
        var filterToSocket = function(client) { return client.socket.id === forSocket.id; };
        //var filterOutSocket = function(client) { return client.socket.id !== socket.id; };
        var makeSend = function(spName) {
            return function(toSend) { 
                sendOnPort(spName, toSend);
            };
        };
        var spInfo, client;

        // if it subscribed to a port
        for (var spName in serialPorts) {
            spInfo = serialPorts[spName];

            client = spInfo.clients.find(filterToSocket);
            if(client) {
                if(client.sendOnDisconnect) {
                    console.log('flushing disconnect, sending ' + client.sendOnDisconnect);
                    client.sendOnDisconnect.forEach( makeSend(spName) );
                }
                client.sendOnDisconnect = [];
            }
        }
    }

    btSocket.on('flushOnDisconnect', function(data, clientCallback) {
        flushOnDisconnect(btSocket);
        if (clientCallback && typeof clientCallback === 'function') clientCallback();
    });

    btSocket.on('sendOnDisconnect', function(data, clientCallback) {
        console.log('sendOnDisconnect', data);
        /*
        var pieces = data.portName.split(':');
        var hostname = pieces[0];
        var portname = pieces[1];
        */
        var spInfo = serialPorts[data.portName];
        if(spInfo && spInfo.clients) {
            spInfo.clients.forEach(function(client) {
                if(client.socket === btSocket) {
                    if(client.sendOnDisconnect === undefined) client.sendOnDisconnect = [];
                    client.sendOnDisconnect.push(data.serialData);
                }
            });
            clientCallback();
        } else {
            clientCallback({err: 'bad portname'});
        }
    });
}
























httpServer.listen(httpServerPort);

var serialPorts = {};



socketIO.set('log level', 1);

socketIO.sockets.on('connection', function(socket) {
    console.log('socketIO connection');
    var spInfo;

    giveSocketBluetoothEvents(socket);

    socket.emit('greeting', {
        hostname: os.hostname(),
        webServer: webServer
    });
});

























// Express ////////////////////////////////////////////////

function createFullPath(filePath) {
    filePath = path.normalize(filePath);
    var folderPath = path.dirname(filePath);

    var currentPath = '';
    var folders = folderPath.split(path.sep);

    for(var i = 0; i < folders.length; i++) {
        if(i !== 0) currentPath += path.sep;
        currentPath += folders[i];

        if(!fs.existsSync(currentPath)) {
            fs.mkdir(currentPath);
        }
    }
}




app.use(express.bodyParser());
app.use(express.cookieParser());
//app.use(express.session({ secret: "whaaaaatS?", store: mongoStore }));


function fetchCacheAndSend(req, res, next, overrideFile) {
    //var webURL = webServer + req.url;
    var webURL;
    if(overrideFile) webURL = webServer + '/' + overrideFile;
    else webURL = webServer + req.url;
    console.log('fetch from \'' + webURL + '\'');
    http.get(webURL, function(webRes) {
        var localPath;
        if(overrideFile) localPath = __dirname + '/public/webcache/' + overrideFile;
        else localPath = __dirname + '/public/webcache' + req.url;

        createFullPath(localPath);
        //console.log('localPath: ', localPath);
        var writeStream = fs.createWriteStream(localPath, {
            flags: 'w',
            encoding: null,
        });
        //console.log('pipe ' + req.url);
        webRes.pipe(writeStream);
        writeStream.on('close', function() {
            //console.log('sendfile ' + req.url);
            res.sendfile(localPath);
        });
        //console.log('webRes ', webRes);
    }).on('error', function(err) {
        console.log('web req error ', err);
        next();
    });
}

app.get('/', function (req, res, next) {
    console.log('send /');
    fetchCacheAndSend(req, res, next, 'client.html');
});

app.get('/screen*', function(req, res, next) {
    console.log('send screen');
    //console.log(req.path);
    fetchCacheAndSend(req, res, next, 'client.html');
});

app.get('/bot/*', function(req, res, next) {
    console.log('send bot queue page');
    fetchCacheAndSend(req, res, next, 'client.html');
    //res.sendfile(__dirname + '/public/client.html');
});

app.get('/js/Bluetooth.js', function(req, res) {
    // deliver the local version of this
    console.log('send bluetooth');
    res.sendfile(__dirname + '/public/js/Bluetooth_local.js');
});



app.get('/*', function(req, res, next) {
    //console.log('send * ' + req.url);
    fetchCacheAndSend(req, res, next);
});

//app.use(express.static(__dirname + '/public',  {maxAge: 1}));




















var clearString = '';
for(var i = 0; i < 40; i++) {
    clearString += '\n';
}
console.log(clearString);

//console.log("\n\n");
console.log("This server is at http://" + localIP + ":" + httpServerPort);
console.log('  Connecting to web server at ' + webServer + '...');
//console.log("\n\n");


var clientMonitor = function() {
    var spInfo, outputString;
    console.log('\nMonitor');

    var stringBuildFunction = function(client) {
            outputString += ' ' + client.socket.id;
        };

    for (var spName in serialPorts) {
        spInfo = serialPorts[spName];
        outputString = spName + '(' + (spInfo.isOpen ? 'open' : 'closed') + ') : ' + spInfo.clients.length;
        spInfo.clients.forEach(stringBuildFunction);
        console.log(outputString);

    }

    setTimeout(clientMonitor, 5000);
};

//clientMonitor();
