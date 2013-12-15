//var webSocketServerPort = 8088;
var httpServerPort = 8080;

var os = require('os');

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

var mongo = require('mongoskin');
//var mongoskinstore = require('mongoskinstore');
var mongoskinstore = require('./mongoskinstore');
var mongodb = mongo.db('mongodb://admin:' + process.env['ROLLERBOTPASSWORD'] + '@paulo.mongohq.com:10018/rollerbot_test?auto_reconnect', {safe: true});
var mongoStore = new mongoskinstore({db: mongodb});

//var WebSocket = require('ws');
//var WebSocketServer = WebSocket.Server;

var express = require('express');
var app = express();


var localIP = require('my-local-ip')();

// Websocket //////////////////////////////////////////////

var httpServer = require('http').createServer(app);

var socketIO = require('socket.io').listen(httpServer);

httpServer.listen(httpServerPort);

var serialPorts = {};



socketIO.set('log level', 1);

socketIO.sockets.on('connection', function(socket) {
    console.log('socketIO connection');
    var spInfo;

    socket.on('disconnect', function() {
        console.log('disconnect ', socket.id);

        var filterOutSocket = function(client) { return client.socket.id !== socket.id; };

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

    socket.on('listPorts', function(data, clientCallback) {
        serialport.list(function (err, ports) {
            if(err) {
                console.log('serial port list error: ',err);
                clientCallback({err: err});
            } else {
                ports.sort(function(a, b) {
                    return +(a.comName.replace('COM',''))>+(b.comName.replace('COM',''));
                });

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

    socket.on('subscribePort', function(data, clientCallback) {
        var portName = data.portName;
        if(portName === undefined || portName === '') {
            console.log('bad port name');
            clientCallback({err: 'bad port name'});
            return;
        }

        console.log(socket.id + ' attempt to subscribe to ' + portName);
        spInfo = serialPorts[data.portName];

        var subscribe_AfterOpen = function() {
            console.log('subscribe_AfterOpen');
            spInfo.isOpen = true;
            if(spInfo.clients.filter(function(client) { return client.socket.id === socket.id; }).length === 0)
                spInfo.clients.push({socket: socket});
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

            serialPort.on('data', function(serialData) {
                console.log('sp on data, ', portName, ', ', serialData.toString());
                spInfo.clients.forEach(function(client) {
                    //console.log('  send sp data to client');
                    client.socket.emit('receiveOnPort', {portName: portName, serialData: serialData.toString()});
                });
            });

            clientCallback();
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
            spInfo.serialPort.removeAllListeners();
            spInfo.serialPort.open(subscribe_AfterOpen);

        } else {
            //subscribe_AfterOpen();
            if(spInfo.clients.filter(function(client) { return client.socket.id === socket.id; }).length === 0)
                spInfo.clients.push({socket: socket});
            clientCallback();
        }

    });

    socket.on('unsubscribePort', function(data, clientCallback) {
        console.log('unsubscribePort', data);
        spInfo = serialPorts[data.portName];
        if(!spInfo) {
            console.log('  unknown port');
            clientCallback({err: 'Port \'' + data.portName + '\' unknown'});
        } else {
            console.log('  filter');
            spInfo.clients = spInfo.clients.filter(function(client) { return client.socket.id !== socket.id; });
            if(spInfo.clients.length === 0) {
                console.log('  length is zero; close if open');
                if(spInfo.isOpen === true) spInfo.serialPort.close();
                spInfo.isOpen = false;
            }
            clientCallback({});
        }
    });

    socket.on('sendOnPort', function(data, clientCallback) {
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
                if(client.socket !== socket) {
                    console.log('    need to send!');
                    client.socket.emit('otherSent', {portName: data.portName, serialData: data.serialData});
                }
            });
        }
    });

    // send initial greeting with hosename

    socket.emit('greeting', {hostname: os.hostname()});
});


// Express ////////////////////////////////////////////////

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: "whaaaaatS?", store: mongoStore }));

app.get('/', function (req, res) {
    //res.redirect('/client.html');
    res.sendfile(__dirname + "/public/client.html");
});

app.get('/screen*', function(req, res) {
    res.sendfile(__dirname + '/public/client.html');
});

app.use(express.static(__dirname + '/public',  {maxAge: 1}));
/*
app.get('/*', function(req, res) {
    res.sendfile(__dirname + '/public/client.html');
});
*/


//app.listen(httpServerPort);
//httpServer.listen(httpServerPort);

//console.log("HTTP listening on port " + httpServerPort);
//console.log("Websocket server on port " + webSocketServerPort);

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