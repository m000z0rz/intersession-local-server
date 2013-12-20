var httpServerPort = 8080;

var os = require('os');

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

var mongo = require('mongoskin');
var mongoskinstore = require('./mongoskinstore');
var mongodb = mongo.db('mongodb://admin:' + process.env['ROLLERBOTPASSWORD'] + '@paulo.mongohq.com:10018/rollerbot_test?auto_reconnect', {safe: true});
var mongoStore = new mongoskinstore({db: mongodb});

var express = require('express');
var app = express();
var http = require('http');


var localIP = require('my-local-ip')();

var fs = require('fs');
var path = require('path');






var webServer = process.env['ROLLERBOTWEBSERVER'];




























// Websocket //////////////////////////////////////////////
var httpServer = http.createServer(app);

var socketIO = require('socket.io').listen(httpServer);

//if(webServer.indexOf(':') === -1) webServer += ':80';
//webServer += ':80'
console.log('  connecting to ' + webServer + '...');
var webSocket = require('socket.io-client').connect(webServer);

webSocket.on('connect', function() {
    console.log('connected to web server at ' + webServer);

    giveSocketBluetoothEvents(webSocket);

    webSocket.emit('registerLocalServer', {hostname: os.hostname()});
});






function giveSocketBluetoothEvents(btSocket) {
    btSocket.removeAllListeners();

    btSocket.on('disconnect', function() {
        console.log('disconnect ', btSocket.id);

        var filterOutSocket = function(client) { return client.socket.id !== btSocket.id; };

        for (var spName in serialPorts) {
            spInfo = serialPorts[spName];
            spInfo.clients = spInfo.clients.filter(filterOutSocket);

            if(spInfo.clients.length === 0 && spInfo.isOpen === true) {
                console.log('closing ' + spName + ' from disconnect');
                spInfo.serialPort.close();
                spInfo.isOpen = false;
            } else {
                console.log('after disconnect, ' + spName + ' - ' + spInfo.clients.length + ' clients left');
            }
        }
    });


    btSocket.on('unsubscribePort', function(data, clientCallback) {
        console.log('unsubscribePort', data);
        spInfo = serialPorts[data.portName];
        if(!spInfo) {
            console.log('  unknown port');
            if(clientCallback) clientCallback({err: 'Port \'' + data.portName + '\' unknown'});
        } else {
            console.log('  filter');
            spInfo.clients = spInfo.clients.filter(function(client) { return client.socket.id !== btSocket.id; });
            if(spInfo.clients.length === 0) {
                console.log('  length is zero; close if open');
                if(spInfo.isOpen === true) spInfo.serialPort.close();
                spInfo.isOpen = false;
            }
            if(clientCallback) clientCallback({});
        }
    });

    btSocket.on('listPorts', function(data, clientCallback) {
        console.log('on listPorts');
        serialport.list(function (err, ports) {
            if(err) {
                console.log('serial port list error: ',err);
                clientCallback({err: err});
            } else {
                ports.sort(function(a, b) {
                    return +(a.comName.replace('COM',''))>+(b.comName.replace('COM',''));
                });
                console.log(' client callback');
                console.log(' hostname: ' + os.hostname());
                console.log('ports ', ports);
                console.log('ports.map ', ports.map);
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
            console.log('bad port name');
            clientCallback({err: 'bad port name'});
            return;
        }

        console.log(btSocket.id + ' attempt to subscribe to ' + portName);
        spInfo = serialPorts[data.portName];

        var subscribe_AfterOpen = function() {
            console.log('subscribe_AfterOpen');
            spInfo.isOpen = true;
            if(spInfo.clients.filter(function(client) { return client.socket.id === btSocket.id; }).length === 0)
                spInfo.clients.push({socket: btSocket});
            var serialPort = spInfo.serialPort;
            serialPort.on('close', function() {
                //console.log('sp on close, ', portName);
                spInfo.isOpen = false;
                spInfo.clients.forEach(function(client) {
                    client.socket.emit('portClosed', {portName: data.portName});
                });
            });

            serialPort.on('error', function(err) {
                console.log('sp on error, ', portName, err);
                spInfo.clients.forEach(function(client) {
                    client.socket.emit('portError', {portName: data.portName, err: err});
                });
            });

            console.log('--- on data');
            serialPort.on('data', function(serialData) {
                console.log('sp on data, ', portName, ', ', serialData.toString());
                spInfo.clients.forEach(function(client) {
                    //console.log('  send sp data to client');
                    client.socket.emit('receiveOnPort', {portName: portName, serialData: serialData.toString()});
                });
            });

            clientCallback({});
        };

        if(!spInfo) {
            spInfo = {};
            serialPorts[data.portName] = spInfo;
            spInfo.isOpen = false;
            spInfo.clients = [];
            console.log('Opening "' + data.portName + '"');
            spInfo.serialPort = new SerialPort(data.portName, {baudrate: 9600, openImmediately: false});

            spInfo.serialPort.open(subscribe_AfterOpen);
        } else if(spInfo.isOpen !== true) {
            console.log('--- remove all listeners');
            spInfo.serialPort.removeAllListeners();
            spInfo.serialPort.open(subscribe_AfterOpen);

        } else {
            //subscribe_AfterOpen();
            if(spInfo.clients.filter(function(client) { return client.socket.id === btSocket.id; }).length === 0)
                spInfo.clients.push({socket: btSocket});
            clientCallback({});
        }

    });


    btSocket.on('sendOnPort', function(data, clientCallback) {
        console.log('sendOnPort', data);
        spInfo = serialPorts[data.portName];
        if(!spInfo) {
            console.log('no spInfo');
            clientCallback({err: 'Port \'' + data.portName + '\' unknown'});
        } else if(spInfo.isOpen !== true) {
            console.log('not open');
            clientCallback({err: 'Port \'' + data.portName + '\' is not open'});
        } else {
            console.log('sending');
            spInfo.serialPort.write(data.serialData);
            console.log('other sent on each client');
            spInfo.clients.forEach(function(client) {
                console.log('  loop client');
                if(client.socket !== btSocket) {
                    console.log('    need to send!');
                    client.socket.emit('otherSent', {
                        portName: data.portName,
                        serialData: data.serialData
                    });
                }
            });
            clientCallback();
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

    // send initial greeting with hosename

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
app.use(express.session({ secret: "whaaaaatS?", store: mongoStore }));


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
    fetchCacheAndSend(req, res, next, 'client.html');
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
console.log("Server is at http://" + localIP + ":" + httpServerPort);
console.log("\n\n");


var clientMonitor = function() {
    var spInfo, outputString;
    console.log('\nMonitor');

    var stringBuildFunction = function(client) {
            outputString += ' ' + client.socket.id;
        };

    for (var spName in serialPorts) {
        spInfo = serialPorts[spName];
        outputString = spName + ': ' + spInfo.clients.length;
        spInfo.clients.forEach(stringBuildFunction);
        console.log(outputString);

    }

    setTimeout(clientMonitor, 5000);
};

//clientMonitor();
