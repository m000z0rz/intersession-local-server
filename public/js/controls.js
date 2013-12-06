var ControlInterface = (function () {
	var serialBufferMaxLength = 20;

	var Bluetooth, shortcut;

	var existingShortcuts = [];

	var bluetoothReceiveListener;
	var controlInterfaces = [];


	//var serialBuffer = '';




	var ControlInterface = function(comPort) {
		this.comPort = comPort;
		this.serialBuffer = '';
		this.receiveWatches = [];
		controlInterfaces.push(this);
		//Bluetooth.openPort(comPort);
	};

	ControlInterface.prototype = new EventEmitter();

	ControlInterface.prototype.send = function(serialData) {
		Bluetooth.sendOnPort(this.comPort, serialData);
	};

	ControlInterface.prototype.watchForReceive = function (rx, onReceive) {
		var regexString = encodeRegex(rx);
		this.receiveWatches.push({
			rx: regexString,
			regex: new RegExp(regexString),
			onReceive: onReceive
		});

		this.recompileReceiveRegex();
	};

	ControlInterface.prototype.recompileReceiveRegex = function() {
		var regexString = '';
		this.receiveWatches.forEach(function (receiveWatch, index) {
			var rxString = receiveWatch.rx;
			if(index !== 0) regexString += '|';
			regexString += '(' + rxString + ')';
		});
		this.compiledReceiveRegex = new RegExp(regexString);
	};

	ControlInterface.prototype.getReceiveWatchByRX = function (rxString) {
		var matchingReceiveWatch;
		this.receiveWatches.forEach(function(receiveWatch) { 
			if(receiveWatch.regex.test(rxString)) {
				matchingReceiveWatch = receiveWatch;
			}
		});
		return matchingReceiveWatch;
	};

	ControlInterface.prototype.makeShortcut = function(key, onPressed, onReleased) {
		var keyIsPressed = false;
		shortcut.add(key, function(e) {
				if(!keyIsPressed) {
					onPressed(e);
					keyIsPressed = true;
				}
			}, {'type': 'keydown'});

		shortcut.add(key, function(e) {
				keyIsPressed = false;
				onReleased(e);
			}, {'type': 'keyup'});

		existingShortcuts.push(key);
	};

	ControlInterface.prototype.removeShortcut = function (key) {
		shortcut.remove(key, 'keydown');
		shortcut.remove(key, 'keyup');
		var index = existingShortcuts.indexOf(key);
		if(index > -1) existingShortcuts.splice(index, 1);

	};

	ControlInterface.prototype.clearShortcuts = function () {
		var self = this;
		//copy array
		var toClear = [];
		existingShortcuts.forEach(function(key) { toClear.push(key); });
		toClear.forEach(function(key) {
			self.removeShortcut(key);
		});
	};
	ControlInterface.prototype.clearEvents = function () {
		var self = this;
		this.clearShortcuts();
		receiveWatches = [];
		controlInterfaces = controlInterfaces.filter(function(controlInterface) {
			return controlInterface !== self;
		});
		//if(bluetoothReceiveListener) Bluetooth.off('receiveOnPort', bluetoothReceiveListener);
	};









	ControlInterface.setBluetooth = function (_bluetooth) {
		Bluetooth = _bluetooth;
		bluetoothReceiveListener = function(data) {
			controlInterfaces.forEach(function(controlInterface) {
				if(data.portName === controlInterface.comPort) {
					var serialBuffer = controlInterface.serialBuffer + data.serialData;


					var regex = controlInterface.compiledReceiveRegex;

					if(regex) {
						var match = regex.exec(serialBuffer);
						while(match) {
							//save the matched string and then trim serial buffer
							var matchedString = match[0];

							serialBuffer = serialBuffer.substr(match.index + match[0].length);
							var matchedReceiveWatch = controlInterface.getReceiveWatchByRX(matchedString);
							var specificMatch = matchedReceiveWatch.regex.exec(matchedString);
							matchedReceiveWatch.onReceive.apply(undefined, specificMatch.slice(1));

							// get next match from trimmer serialBuffer
							match = regex.exec(serialBuffer);
						}
					}

					if(serialBuffer.length > serialBufferMaxLength)
						serialBuffer = serialBuffer.substr(-serialBufferMaxLength);


					controlInterface.serialBuffer = serialBuffer;

				}
			});
		};

		Bluetooth.on('receiveOnPort', bluetoothReceiveListener);
	};



	// '\\' must be first
	var regexSpecialCharacters = ['\\', '^', '$', '*', '+', '.',
		'(', ')', '=', ':', '!', '|','[',']','{','}',',','-'
		];
	var parameterCharacter = '?';

	var encodeRegex = function(propertyValue) {
		var regexString = propertyValue;
		regexSpecialCharacters.forEach(function(character) {
			regexString = regexString.replace(character, '\\' + character);
		});

		regexString = regexString.replace(parameterCharacter, '(\\-?\\d+)');
		//return new RegeExp(regexString);
		return regexString;
	};


	ControlInterface.setShortcut = function (_shortcut) {
		shortcut = _shortcut;
	};

	


	return ControlInterface;
}) ();

















// to do: track properties, getPropertyValue, toJSON and a reviver?
var Control = (function () {
	var Control = function(_controlDefinition, _x, _y) {
		var self = this;
		this.controlDefinition = _controlDefinition;
		var controlDefinition = _controlDefinition;

		this.x = _x || 0;
		this.y = _y || 0;

		this.svg = {};

		var propValues = {};

		this.buildForEdit = function() {
			this.element = controlDefinition.buildSVG(self);
			var g = this.element;
			//g.x = this.x; g.y = this.y;
			svgAttr(g, 'class', 'draggable');
			svgAttr(g, 'transform', 'translate(' + this.x + ' ' + this.y + ')');
			return g;
		};

		this.buildForControl = function(controlInterface) {
			this.element = controlDefinition.buildSVG(self);
			var g = this.element;
			controlDefinition.wireEvents(self, controlInterface);
			svgAttr(g, 'transform', 'translate(' + this.x + ' ' + this.y + ')');
			return g;
		};

		this.translate = function(dX, dY) {
			this.setPosition(this.x + dX, this.y + dY);
		};

		this.setPosition = function(_x, _y) {
			this.x = _x; this.y = _y;
			svgAttr(this.element, 'transform', 'translate(' + this.x + ' ' + this.y + ')');
			//this.emit('change', [{source: 'setPosition'}]);
		};

		this.getPropertyValue = function(propName) {
			var propValue = propValues[propName];
			if(!propValue && controlDefinition.properties[propName].defaultValue) propValue = controlDefinition.properties[propName].defaultValue;
			return propValue;
		};

		this.setPropertyValue = function(propName, value) {
			var oldValue = propValues[propName];
			propValues[propName] = value;
			var onChange = controlDefinition.properties[propName].onChange;
			if(onChange) onChange(self, value, oldValue);
			this.emit('change', [{source: 'setPropertyValue', propName: propName}]);
		};

		this.setPropValues = function(_propValues, suppressChangeEvent) {
			propValues = _propValues;
			if(!suppressChangeEvent) self.emit('change', [{source: 'setPropValues'}]);
		};

		this.toJSON = function() {
			return {
				x: self.x,
				y: self.y,
				propValues: propValues,
				controlDefinitionTypeID: self.controlDefinition.typeID
			};
		};
	}; 

	//Control.prototype = new EventEmitter();
	Control.prototype = new EventEmitter();
	Control.prototype.emit = Control.prototype.emitEvent;

	Control.fromJSON = function(json) {
		var definition = getControlDefinitionByTypeID(json.controlDefinitionTypeID);

		var control = new Control(definition, json.x, json.y);
		control.setPropValues(json.propValues, true);
		//control.setPropValues(json.propValues);

		return control;
	};

	return Control;
}) ();






















var Controller = (function () {
	var Controller = function(_forHostname, _forPort) {
		var self = this;

		this.controls = [];

		var forHostname = _forHostname;
		var forPort = _forPort;

		this.getForHostname = function() { return forHostname; };
		this.getForPort = function() { return forPort; };
		this.getCompiledID = function() { return (forHostname || '') + '&' + (forPort || ''); };

		this.setForHostname = function(value) { forHostname = value; };
		this.setForPort = function(value) { forPort = value; };

		var saveCallback = function(data) {
			console.log('save callback, data ',data);
			if(data && data.err) console.log('save err ', data.err);
			else console.log('save successful');
		};

		this.addControl = function(control, suppressSave) {
			this.controls.push(control);
			control.on('change', function(data) {
				console.log('control changed, saving');
				self.save(saveCallback);
			});

			//console.log('control added, saving');
			if(!suppressSave) this.save(saveCallback);
		};

		this.removeControl = function(control) {
			var index = this.controls.indexOf(control);
			if(index > -1) this.controls.splice(index, 1);

			console.log('control removed, saving');
			this.save(saveCallback);
		};




		this.toJSON = function() {
			return {
				forHostname: forHostname,
				forPort: forPort,
				compiledID: self.getCompiledID(),
				controls: self.controls
			};
		};

		this.save = function(callback) {
			var controllers = JSON.parse(localStorage.getItem('controllers')) || {};
			var thisJSON = this.toJSON();

			controllers[self.getCompiledID()] = thisJSON;
			localStorage.setItem('controllers', JSON.stringify(controllers));

			if(webSocket.socket.connected) {
				webSocket.emit('saveController', {controller: thisJSON}, function(data) {
					if(callback && typeof callback === 'function') callback(data);
				});
			}
		};

	};

	Controller.prototype = new EventEmitter();

	Controller.fromJSON = function(json) {
		var controller = new Controller(json.forHostname, json.forPort);

		json.controls.forEach(function(jsonControl) {
			//controller.controls.push(Control.fromJSON(jsonControl));
			controller.addControl(Control.fromJSON(jsonControl), true);
		});

		return controller;
	};

	Controller.fetch = function(forHostname, forPort, callback) {
		var controllerJSON;
		var compiledID = forHostname + '&' + forPort;
		var localFallback = function() {
			var controllers = JSON.parse(localStorage.getItem('controllers'));
			console.log('local: ', controllers);
			controllerJSON = controllers[compiledID];
			window.controllers = controllers;
			console.log('compiled id ', compiledID);
			console.log('controller JSON ', controllerJSON);
			if(!controllerJSON || controllerJSON === '') callback();
			else callback(Controller.fromJSON(controllerJSON));
		};

		if(webSocket.socket.connected) {
			webSocket.emit('fetchController', { compiledID: compiledID }, function(data) {
				if(data.err) {
					console.log('controller fetch err ', data.err);
					localFallback();
				} else {
					if(data.controller && data.controller !== '') callback(Controller.fromJSON(data.controller));
					else callback();
				}
			});
		} else {
			localFallback();
		}
	};

	return Controller;
}) ();