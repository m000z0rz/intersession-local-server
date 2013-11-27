var controlDefinitions = [];
var controlDefinitionByTypeID = {};

function defineControl(definitionFunction) {
	var controlDefinition = definitionFunction();

	controlDefinition.forEachProperty = function(func) {
		for(var propName in controlDefinition.properties) {
			func(controlDefinition.properties[propName], propName);
		}
	};

	controlDefinitions.push(controlDefinition);
	controlDefinitionByTypeID[controlDefinition.typeID] = controlDefinition;
}

function getControlDefinitionByTypeID(typeID) {
	return controlDefinitionByTypeID[typeID];
}

function createSVGElement(tagName) {
	//console.log('create svg, svgns=' + svgns);
	return document.createElementNS(svgns, tagName);
}

function svgAttr(element, attribute, value) {
	if(arguments.length === 2) { 
		return element.getAttributeNS(null, attribute);
	} else {
		element.setAttributeNS(null, attribute, value);
	}
}

function svgTranslate(element, dX, dY) {
	var newX, newY;
	var pos = svgGetPosition(element);

	newX = pos.x + dX; newY = pos.y + dY;
	//newX = svgAttr(element, 'x') + dX; newY = svgAttr(element, 'y') + dY;
	//console.log('new x y ', newX, newY);
	svgAttr(element, 'transform', 'translate(' + newX + ' ' + newY + ')');
}

function svgGetPosition(element) {
	var x, y;
	var currentTransform = svgAttr(element, 'transform');
	var translateRegex = /translate\((\-?\d+\.?\d*) (\-?\d+\.?\d*)\)/;
	var regexResults = currentTransform.match(translateRegex);
	if(regexResults && regexResults[1] && regexResults[2]) {
		//console.log('old x y ', regexResults[1], regexResults[2]);
		x = +regexResults[1];
		y = +regexResults[2];
	} else {
		x = 0;
		y = 0;
	}

	return {x: x, y: y};
}

function svgSetPosition(element, x, y) {
	svgAttr(element, 'transform', 'translate(' + x + ' ' + y + ')');
}

function addPointerListeners(element, eventArray, listener) {
	eventArray.forEach(function(eventName) {
		if(eventName.indexOf('touch') !== -1) {
			element.addEventListener(eventName, function(e) {
				listener(e);
				e.preventDefault();
				return false;
			}, false);
		} else {
			element.addEventListener(eventName, listener, false);
		}
	});
}

function getScale(element, fromWidth, fromHeight) {
	var aspectRatio = fromWidth / fromHeight;
	//console.log('apsectRatio ', aspectRatio);
	if(element.offsetWidth > aspectRatio * element.offsetHeight) {
		//console.log('fromHeight ', fromHeight);
		//console.log('offset ', element.offsetHeight);
		return fromHeight / element.offsetHeight;
	} else {
		//console.log('fromWidth ', fromWidth);
		//console.log('offset ', element.offsetWidth);
		return fromWidth / element.offsetWidth;
	}
}

function getControlScale(svg) {
	return getScale(svg, 2000, 1000);
}














// basicButton
defineControl(function() {
	var controlDefinition = {
		typeID: 'basicButton',
		displayName: 'Button',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var rect = createSVGElement('rect');
			svgAttr(rect, 'x', 0); svgAttr(rect, 'y', 0);
			svgAttr(rect, 'rx', 10); svgAttr(rect, 'ry', 10);
			svgAttr(rect, 'width', '150'); svgAttr(rect, 'height', '150');

			rect.style.fill = '#e7e7e9';
			rect.style.stroke = '#333333';
			rect.style.strokeWidth = 5;
			g.appendChild(rect);
			control.svg.rect = rect;

			var keyLabel = createSVGElement('text');
			svgAttr(keyLabel, 'x', 75); svgAttr(keyLabel, 'y', 75);
			svgAttr(keyLabel, 'text-anchor', 'middle');
			svgAttr(keyLabel, 'alignment-baseline', 'middle');
			svgAttr(keyLabel, 'font-size', '4em');
			svgAttr(keyLabel, 'font-weight', 'bold');
			keyLabel.textContent = control.getPropertyValue('keyboardShortcut') || '';
			//keyLabel.x = 8; keyLabel.y = 50;
			g.appendChild(keyLabel);
			control.svg.keyLabel = keyLabel;

			var buttonLabel = createSVGElement('text');
			svgAttr(buttonLabel, 'x', 75); svgAttr(buttonLabel, 'y', 160);
			svgAttr(buttonLabel, 'text-anchor', 'middle');
			svgAttr(buttonLabel, 'alignment-baseline', 'text-before-edge');
			svgAttr(buttonLabel, 'font-size', '2em');
			buttonLabel.textContent = control.getPropertyValue('label') || '';
			g.appendChild(buttonLabel);
			control.svg.buttonLabel = buttonLabel;

			return g;
		},

		wireEvents: function(control, controlInterface) {
			var buttonPressed = false;

			function pressed() {
				var toSend = control.getPropertyValue('sendOnPress');
				if(toSend && toSend !== '') controlInterface.send(toSend);
				control.svg.rect.style.fill = 'gold';
			}

			function released() {
				var toSend = control.getPropertyValue('sendOnRelease');
				if(toSend && toSend !== '') controlInterface.send(toSend);
				control.svg.rect.style.fill = '#e7e7e9';
			}

			var svg = control.svg;

			[svg.rect, svg.keyLabel].forEach(function(element) {
				addPointerListeners(element, ['touchstart', 'mousedown'], function(e) {
					buttonPressed = true;
					pressed();
				});
				element.style.cursor = 'pointer';
			});

			[svg.rect, svg.keyLabel].forEach(function(element) {
				addPointerListeners(element, ['touchend', 'mouseup'], function(e) {
					if(buttonPressed === true) released();
					buttonPressed = false;
				});
			});

			svg.rect.addEventListener('mouseout', function(e) {
				if(buttonPressed === true) released();
			}, false);

			var key = control.getPropertyValue('keyboardShortcut');
			if(key && key !== '') {
				controlInterface.makeShortcut(key, pressed, released);
				control.svg.keyLabel.textContent = key;
			}

		},

		properties: {
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.buttonLabel.textContent = newValue;
				}
			},
			keyboardShortcut: {
				displayName: 'Key Shortcut',
				type: 'keyboardShortcut',
				onChange: function(control, newValue, oldValue) {
					control.svg.keyLabel.textContent = newValue;
				}
			},
			sendOnPress: {
				displayName: 'Send on press',
				type: 'serial'
			},
			sendOnRelease: {
				displayName: 'Send on release',
				type: 'serial'
			}
		},

	};

	return controlDefinition;
});



















// toggleSwitch





























// horizontal
defineControl(function() {
	var sliderLength = 900;
	var sliderRadius = 100;

	var sliderMinX = sliderRadius;
	var sliderMaxX = sliderLength - sliderRadius;

	function map(value, fromMin, fromMax, toMin, toMax) {
		return (value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin;
	}

	var getSliderValue = function(control) {
		var pos = svgGetPosition(control.svg.slider);
		return Math.round(map(pos.x, sliderMinX, sliderMaxX, 0, 1023));
	};



	function snap(control) {
		var slider = control.svg.slider;
		var snapTo = control.getPropertyValue('snapTo');
		var pos = svgGetPosition(slider);
		if (snapTo === 'None') {
			// nada
		} else if (snapTo === 'Right') {
			svgSetPosition(slider, sliderMaxX, pos.y);
		} else if (snapTo === 'Left') {
			svgSetPosition(slider, sliderMinX, pos.y);
		} else {
			svgSetPosition(slider, (sliderMaxX + sliderMinX)/2, pos.y);
		}
	}





	var controlDefinition = {
		typeID: 'horizontalSlider',
		displayName: 'H Slider',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var rect = createSVGElement('rect');
			svgAttr(rect, 'y', 80); svgAttr(rect, 'x', 0);
			svgAttr(rect, 'rx', 10); svgAttr(rect, 'ry', 10);
			svgAttr(rect, 'height', '40'); svgAttr(rect, 'width', sliderLength);
			//rect.style.fill = '#333333';
			rect.style.fill = '#575759';
			rect.style.stroke = '#333333';
			rect.style.strokeWidth = 5;
			g.appendChild(rect);
			control.svg.rect = rect;

			var slider = createSVGElement('g');
			svgAttr(slider, 'transform', 'translate(0 100)');
			control.svg.slider = slider;
			var snapTo = control.getPropertyValue('snapTo');
			if(snapTo === 'None') {
				svgSetPosition(slider, sliderMinX, 100);
			} else {
				snap(control);
			}

			g.appendChild(slider);

			var circle = createSVGElement('circle');
			svgAttr(circle, 'r', 100);
			circle.style.fill = '#e7e7e9';
			circle.style.stroke = '#333333';
			circle.style.strokeWidth = 5;
			slider.appendChild(circle);
			control.svg.circle = circle;


			var label = createSVGElement('text');
			svgAttr(label, 'text-anchor', 'middle');
			svgAttr(label, 'alignment-baseline', 'middle');
			svgAttr(label, 'font-size', '2em');
			label.textContent = control.getPropertyValue('label') || '';
			slider.appendChild(label);
			control.svg.label = label;

			return g;
		},

		wireEvents: function(control, controlInterface) {
			var circle = control.svg.circle;
			var slider = control.svg.slider;
			var isDragging = false;
			var lastDragPosition = {};
			var dragTouchIdentifier;

			slider.style.cursor = 'pointer';


			slider.addEventListener('touchstart', function(e) {
				var touch = e.changedTouches[0];
				dragTouchIdentifier = touch.identifier;
				//screenEdit_selectControl(control);

				isDragging = true;
				lastDragPosition = {
					x: touch.clientX, y: touch.clientY
				};
				circle.style.fill = 'gold';
				e.preventDefault();
				return false;
			}, false);
			slider.addEventListener('mousedown', function(e) {
				isDragging = true;
				lastDragPosition = {
					x: e.clientX, y: e.clientY
				};
				circle.style.fill = 'gold';
			}, false);

			var scaleFactor;
			var svg = document.getElementById('screenControl_svg');



			svg.addEventListener('touchmove', function(e) {
				var touch;
				asArray(e.changedTouches).forEach(function(t) {
					if (t.identifier === dragTouchIdentifier) touch = t;
				});
				if(touch) {
					drag(e, touch.clientX);
				}
			}, false);

			svg.addEventListener('mousemove', function(e) {
				drag(e, e.clientX);
			}, false);


			var timeoutID;
			var lastSend_ms = (new Date()).valueOf();
			var sendMinInterval = 100;

			function sendCurrentValue() {
				var value = getSliderValue(control);
				var toSend = control.getPropertyValue('sendOnChange');
				if(toSend && toSend !== '') {
					toSend = toSend.replace('?', value);
					//console.log('send ',toSend);
					controlInterface.send(toSend);
				}

				lastSend_ms = (new Date()).valueOf();
			}

			function drag(e, clientX) {
				var scaleFactor;
				if(isDragging) {
					scaleFactor = getControlScale(svg);
					var dX = clientX - lastDragPosition.x;

					svgTranslate(slider, scaleFactor * dX, 0);
					lastDragPosition = {x: clientX};

					var pos = svgGetPosition(slider);
					if(pos.x < sliderMinX) svgSetPosition(slider, sliderMinX, pos.y);
					if(pos.x > sliderMaxX) svgSetPosition(slider, sliderMaxX, pos.y);

					var delay_ms, now_ms;
					now_ms = (new Date()).valueOf();
					if(now_ms - lastSend_ms > sendMinInterval) delay_ms = 0;
					else delay_ms = sendMinInterval - (now_ms - lastSend_ms);

					if(timeoutID) window.clearTimeout(timeoutID);
					timeoutID = window.setTimeout(sendCurrentValue, delay_ms);
				}
				e.preventDefault();
				return false;
			}




			var endDrag = function() {
				circle.style.fill = '#e7e7e9';
				dragTouchIdentifier = undefined;
				isDragging = false;
				snap(control);
				sendCurrentValue();
			};

			addPointerListeners(slider, ['mouseup', 'touchend'], endDrag);
			svg.addEventListener('mouseleave', endDrag, false);
			svg.addEventListener('mouseup', endDrag, false);
		},

		properties: {
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.label.textContent = newValue;
				}
			},
			snapTo: {
				displayName: 'When not pressed, snap to',
				type: 'select',
				values: [
					'None',
					'Middle',
					'Left',
					'Right'
				],
				defaultValue: 'Middle',
				onChange: function(control, newValue, oldValue) {

				}
			},
			sendOnChange: {
				displayName: 'Send on change (? will be replaced with value)',
				type: 'serial'
			},

		},

		helpText: 'Sends a value between 0 and 1023'
	};

	return controlDefinition;
});






























// vertical
defineControl(function() {
	var sliderLength = 900;
	var sliderRadius = 100;

	var sliderMinY = sliderRadius;
	var sliderMaxY = sliderLength - sliderRadius;

	function map(value, fromMin, fromMax, toMin, toMax) {
		return (value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin;
	}

	var getSliderValue = function(control) {
		var pos = svgGetPosition(control.svg.slider);
		return Math.round(map(pos.y, sliderMaxY, sliderMinY, 0, 1023));
		//return (sliderMaxY - pos.y - sliderMinY) * 1024 / sliderMaxValue;
	};



	function snap(control) {
		var slider = control.svg.slider;
		var snapTo = control.getPropertyValue('snapTo');
		var pos = svgGetPosition(slider);
		if (snapTo === 'None') {
			// nada
		} else if (snapTo === 'Top') {
			svgSetPosition(slider, pos.x, sliderMinY);
		} else if (snapTo === 'Bottom') {
			svgSetPosition(slider, pos.x, sliderMaxY);
		} else {
			svgSetPosition(slider, pos.x, (sliderMaxY + sliderMinY)/2);
		}
	}





	var controlDefinition = {
		typeID: 'verticalSlider',
		displayName: 'V Slider',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var rect = createSVGElement('rect');
			svgAttr(rect, 'x', 80); svgAttr(rect, 'y', 0);
			svgAttr(rect, 'rx', 10); svgAttr(rect, 'ry', 10);
			svgAttr(rect, 'width', '40'); svgAttr(rect, 'height', sliderLength);
			//rect.style.fill = '#333333';
			rect.style.fill = '#575759';
			rect.style.stroke = '#333333';
			rect.style.strokeWidth = 5;
			g.appendChild(rect);
			control.svg.rect = rect;

			var slider = createSVGElement('g');
			svgAttr(slider, 'transform', 'translate(100 0)');
			control.svg.slider = slider;
			var snapTo = control.getPropertyValue('snapTo');
			if(snapTo === 'None') {
				svgSetPosition(slider, 100, sliderMaxY);
			} else {
				snap(control);
			}

			g.appendChild(slider);

			var circle = createSVGElement('circle');
			svgAttr(circle, 'r', 100);
			circle.style.fill = '#e7e7e9';
			circle.style.stroke = '#333333';
			circle.style.strokeWidth = 5;
			slider.appendChild(circle);
			control.svg.circle = circle;


			var label = createSVGElement('text');
			svgAttr(label, 'text-anchor', 'middle');
			svgAttr(label, 'alignment-baseline', 'middle');
			svgAttr(label, 'font-size', '2em');
			label.textContent = control.getPropertyValue('label') || '';
			slider.appendChild(label);
			control.svg.label = label;

			return g;
		},

		wireEvents: function(control, controlInterface) {
			var circle = control.svg.circle;
			var slider = control.svg.slider;
			var isDragging = false;
			var lastDragPosition = {};
			var dragTouchIdentifier;

			slider.style.cursor = 'pointer';


			slider.addEventListener('touchstart', function(e) {
				var touch = e.changedTouches[0];
				dragTouchIdentifier = touch.identifier;
				//screenEdit_selectControl(control);

				isDragging = true;
				lastDragPosition = {
					x: touch.clientX, y: touch.clientY
				};
				circle.style.fill = 'gold';
				e.preventDefault();
				return false;
			}, false);
			slider.addEventListener('mousedown', function(e) {
				isDragging = true;
				lastDragPosition = {
					x: e.clientX, y: e.clientY
				};
				circle.style.fill = 'gold';
			}, false);

			var scaleFactor;
			var svg = document.getElementById('screenControl_svg');



			svg.addEventListener('touchmove', function(e) {
				var touch;
				asArray(e.changedTouches).forEach(function(t) {
					if (t.identifier === dragTouchIdentifier) touch = t;
				});
				if(touch) {
					drag(e, touch.clientY);
				}
			}, false);

			svg.addEventListener('mousemove', function(e) {
				drag(e, e.clientY);
			}, false);


			var timeoutID;
			var lastSend_ms = (new Date()).valueOf();
			var sendMinInterval = 100;

			function sendCurrentValue() {
				var value = getSliderValue(control);
				var toSend = control.getPropertyValue('sendOnChange');
				if(toSend && toSend !== '') {
					toSend = toSend.replace('?', value);
					console.log('send ',toSend);
					controlInterface.send(toSend);
				}

				lastSend_ms = (new Date()).valueOf();
			}

			function drag(e, clientY) {
				var scaleFactor;
				if(isDragging) {
					scaleFactor = getControlScale(svg);
					var dY = clientY - lastDragPosition.y;

					svgTranslate(slider, 0, scaleFactor * dY);
					lastDragPosition = {y: clientY};

					var pos = svgGetPosition(slider);
					if(pos.y < sliderMinY) svgSetPosition(slider, pos.x, sliderMinY);
					if(pos.y > sliderMaxY) svgSetPosition(slider, pos.x, sliderMaxY);

					var delay_ms, now_ms;
					now_ms = (new Date()).valueOf();
					if(now_ms - lastSend_ms > sendMinInterval) delay_ms = 0;
					else delay_ms = sendMinInterval - (now_ms - lastSend_ms);

					if(timeoutID) window.clearTimeout(timeoutID);
					timeoutID = window.setTimeout(sendCurrentValue, delay_ms);
				}
				e.preventDefault();
				return false;
			}




			var endDrag = function() {
				circle.style.fill = '#e7e7e9';
				dragTouchIdentifier = undefined;
				isDragging = false;
				snap(control);
				sendCurrentValue();
			};

			addPointerListeners(slider, ['mouseup', 'touchend'], endDrag);
			svg.addEventListener('mouseleave', endDrag, false);
			svg.addEventListener('mouseup', endDrag, false);
		},

		properties: {
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.label.textContent = newValue;
				}
			},
			snapTo: {
				displayName: 'When not pressed, snap to',
				type: 'select',
				values: [
					'None',
					'Middle',
					'Bottom',
					'Top'
				],
				defaultValue: 'Middle',
				onChange: function(control, newValue, oldValue) {

				}
			},
			sendOnChange: {
				displayName: 'Send on change (? will be replaced with value)',
				type: 'serial'
			},

		},

		helpText: 'Sends a value between 0 and 1023'
	};

	return controlDefinition;
});





























// two axis


















// indicator
defineControl(function() {
	var controlDefinition = {
		typeID: 'indicator',
		displayName: 'Indicator',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var circle = createSVGElement('circle');
			svgAttr(circle, 'cx', 75); svgAttr(circle, 'cy', 75);
			svgAttr(circle, 'r', 75);
			circle.style.fill = '#e7e7e9';
			circle.style.stroke = '#333333';
			circle.style.strokeWidth = 5;
			g.appendChild(circle);
			control.svg.circle = circle;

			var indicatorLabel = createSVGElement('text');
			svgAttr(indicatorLabel, 'x', 74); svgAttr(indicatorLabel, 'y', 160);
			svgAttr(indicatorLabel, 'text-anchor', 'middle');
			svgAttr(indicatorLabel, 'alignment-baseline', 'text-before-edge');
			svgAttr(indicatorLabel, 'font-size', '2em');
			indicatorLabel.textContent = control.getPropertyValue('label') || '';
			g.appendChild(indicatorLabel);
			control.svg.indicatorLabel = indicatorLabel;

			return g;
		},
		wireEvents: function(control, controlInterface) {
			controlDefinition.forEachColor(function(colorName, color) {
				var rx = control.getPropertyValue('onReceive_' + colorName);
				if(rx && rx !== '') {
					controlInterface.watchForReceive(rx, function() {
						//console.log('called! ', arguments);
						control.svg.circle.style.fill = color;
					});
				}
			});
		},
		properties: {
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.buttonLabel.textContent = newValue;
				}
			},
		},
	};

	controlDefinition.colors = {
		'red': 'FireBrick',
		'orange': 'DarkOrange',
		'yellow': 'Gold',
		'green': 'ForestGreen',
		'blue': 'CornflowerBlue',
		'purple': 'DarkOrchid',
		'white': 'Cornsilk',
		'gray': 'DimGray',
		'black': 'Black'
	};

	controlDefinition.forEachColor = function(func) {
		for(var colorName in controlDefinition.colors) {
			func(colorName, controlDefinition.colors[colorName]);
		}
	};

	for(var colorName in controlDefinition.colors) {
		//var color = controlDefinition.colors[colorName];

		var newProp = {};
		var propName = 'onReceive_' + colorName;
		newProp.displayName = colorName + ' when received';
		newProp.type = 'serial';

		controlDefinition.properties[propName] = newProp;
	}


	return controlDefinition;
});









// gauge, meter?