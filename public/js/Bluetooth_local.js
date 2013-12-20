var localSocket = io.connect(window.location.origin);
var webSocket;

localSocket.on('greeting', function(data) {
	console.log('on greeting, ', data);

	var webServer = data.webServer;

	//if(webServer.indexOf(':') === -1) webServer = webServer + ':80'; // specify port 80 if it isn't specified by server
	//webServer = webServer + ':80';

	console.log('connect to ', webServer);

	webSocket = io.connect(webServer);


	webSocket.on('connect', function(data) {
		console.log('websocket connect');
		Bluetooth.ready();
	});
});





var Bluetooth = (function() {
	// defined dynamically based on whether we're communicating with Bluetooth via a web interface or android
	var Bluetooth = new EventEmitter();
	Bluetooth.emit = Bluetooth.emitEvent; // alias to match socket.io convention


	Bluetooth.isReady = false;
	//var socket = io.connect(window.location.origin);

	localSocket.on('connect', function () {
		//console.log('bt socket opened');
	});

	Bluetooth.ready = function() {
		Bluetooth.isReady = true;
		Bluetooth.emit('ready');
	};

	/*
	localSocket.on('greeting', function(data) {
		//console.log('greeting received from ' + data.hostname);
		state.hostname = data.hostname;
		Bluetooth.isReady = true;
		Bluetooth.emit('ready');
	});
*/

	localSocket.on('disconnect', function() {
		//console.log('socket disconnected');
	});

	localSocket.on('error', function(err) {
		console.log('socket error', err);
	});

	localSocket.on('receiveOnPort', function(data) {
		Bluetooth.emit('receiveOnPort', [data]);
	});

	localSocket.on('otherSent', function(data) {
		Bluetooth.emit('otherSent', [data]);
	});

	localSocket.on('portError', function(data) {
		console.log('portError: ', data);
	});

	localSocket.on('portClosed', function(data) {
		console.log('portClosed: ', data);
	});

	Bluetooth.listPorts = function(callback) {
		localSocket.emit('listPorts', {}, function(data) {
			//console.log('listPorts callback');
			if(data.err) console.log('listPorts callback err ', err);
			else callback(data);
		});
	};

	Bluetooth.openPort = function(portName, callback) {
		localSocket.emit('subscribePort', {portName: portName}, function(data) {
			if(callback && typeof callback === 'function') {
				if(data && data.err) callback(data.err);
				else callback();
			}
		});
	};

	Bluetooth.closePort = function(portName, callback) {
		localSocket.emit('unsubscribePort', {portName: portName}, function(data) {
			if(callback && typeof callback === 'function') callback();
		});
	};

	Bluetooth.sendOnPort = function(portName, data, callback) {
		localSocket.emit('sendOnPort', {portName: portName, serialData: data}, function(data) {
			if(callback && typeof callback === 'function') {
				if(data && data.err) callback(data.err);
				else callback();
			}
		});
		Bluetooth.emit('thisSent', [{
			portName: portName,
			serialData: data
		}]);
	};

	return Bluetooth;
}) ();