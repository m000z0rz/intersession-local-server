var Bluetooth = (function() {
	// defined dynamically based on whether we're communicating with Bluetooth via a web interface or android
	var Bluetooth = new EventEmitter();
	Bluetooth.emit = Bluetooth.emitEvent; // alias to match socket.io convention


	Bluetooth.isReady = false;
	var socket = io.connect(window.location.origin);

	socket.on('connect', function () {
		//console.log('bt socket opened');
	});

	socket.on('greeting', function(data) {
		//console.log('greeting received from ' + data.hostname);
		state.hostname = data.hostname;
		Bluetooth.isReady = true;
		Bluetooth.emit('ready');
	});

	socket.on('disconnect', function() {
		//console.log('socket disconnected');
	});

	socket.on('error', function(err) {
		console.log('socket error', err);
	});

	socket.on('receiveOnPort', function(data) {
		Bluetooth.emit('receiveOnPort', [data]);
	});

	socket.on('otherSent', function(data) {
		Bluetooth.emit('otherSent', [data]);
	});

	Bluetooth.listPorts = function(callback) {
		socket.emit('listPorts', {}, function(data) {
			//console.log('listPorts callback');
			if(data.err) console.log('listPorts callback err ', err);
			else callback(data);
		});
	};

	Bluetooth.openPort = function(portName, callback) {
		socket.emit('subscribePort', {portName: portName}, function(data) {
			if(callback && typeof callback === 'function') {
				if(data && data.err) callback(data.err);
				else callback();
			}
		});
	};

	Bluetooth.closePort = function(portName, callback) {
		socket.emit('unsubscribePort', {portName: portName}, function(data) {
			if(callback && typeof callback === 'function') callback();
		});
	};

	Bluetooth.sendOnPort = function(portName, data, callback) {
		socket.emit('sendOnPort', {portName: portName, serialData: data}, function(data) {
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