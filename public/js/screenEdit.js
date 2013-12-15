// screen edit
defineScreen(function (screen) {
	return {
		name: 'screenEdit',
		full: true,
		onResize: function(screen) {
			var svg = screen.dom.svg;
			var titleBar = screen.dom.titleBar;
			svg.style.height = window.innerHeight - titleBar.offsetHeight;
		},
		buildDOM: function (screen, div) {

			function deleteControl() {
				var svg = screen.dom.svg;
				var control = screen.selectedControl;
				if(control) {
					console.log('removing');
					svg.removeChild(control.element);
					clearSelection();
					screen.controller.removeControl(control);
				}
			}
			screen.deleteControl = deleteControl;


			function clearSelection() {
				var oldControl = screen.selectedControl;
				if(oldControl) oldControl.element.style.opacity = 1;
				screen.selectedControl = undefined;
				document.getElementById('screenEdit_properties').className = 'titleIconButtonDeactivated';
				document.getElementById('screenEdit_delete').className = 'titleIconButtonDeactivated';
			}
			screen.clearSelection = clearSelection;


			function selectControl(control) {
				var oldControl = screen.selectedControl;
				if(oldControl) oldControl.element.style.opacity = 1;
				screen.selectedControl = control;
				control.element.style.opacity = 0.5;
				document.getElementById('screenEdit_properties').className = 'titleIconButton';
				document.getElementById('screenEdit_delete').className = 'titleIconButton';
			}
			screen.selectControl = selectControl;

			function putControl(control) {
				var svg = screen.dom.svg;
				var g = control.buildForEdit();
				svg.appendChild(g);
				svgAttr(g, 'class', 'draggable');

				
				g.addEventListener('touchstart', function(e) {
					var touch = e.touches[0];
					screen.selectControl(control);

					screen.isDragging = true;
					screen.lastDragPosition = {
						x: touch.clientX, y: touch.clientY
					};
					e.preventDefault();
					return false;
				}, false);
				g.addEventListener('mousedown', function(e) {
					screen.selectControl(control);

					screen.isDragging = true;
					screen.lastDragPosition = {
						x: e.clientX, y: e.clientY
					};
				}, false);
				g.addEventListener('touchmove', function(e) {
					var touch = e.touches[0];
					//var editSVG = document.getElementById('screenEdit_svg');
					if(screen.isDragging) {
						var scaleFactor = getControlScale(svg);
						/*
						if(svg.offsetWidth > 2*svg.offsetHeight) {
							// width is in excess; height controls scale
							scaleFactor = 1000 / svg.offsetHeight;
						} else {
							// height is in excess; width controls scale
							scaleFactor = 2000 / svg.offsetWidth;
						}
						*/
						var dX = touch.clientX - screen.lastDragPosition.x;
						var dY = touch.clientY - screen.lastDragPosition.y;
						screen.selectedControl.translate(scaleFactor * dX, scaleFactor * dY);
						screen.lastDragPosition = {x: touch.clientX, y: touch.clientY};
						e.preventDefault();
						return false;
					} 
				}, false);

				g.addEventListener('click', function(e) {
					e.stopPropagation(); // stop it from going to svg which deselects;
				}, false); 
				g.addEventListener('dblclick', function(e) {
					//navigate_screenEditProperties(control);
					screen.navigateTo('screenEditProperties', {}, {control: control});
				}, false);
				g.addEventListener('mouseup', function(e) {
					screen.isDragging = false;
					screen.controller.save();
				}, false);

				var lastTouchStart;
				g.addEventListener('touchend', function(e) {
					var thisTouchStart = (new Date()).valueOf();
					if(thisTouchStart - lastTouchStart < 300) {
						// double click
						setTimeout(function() {
							//navigate_screenEditProperties(control);
							screen.navigateTo('screenEditProperties', {}, {control: control});
						}, 0);
					}

					lastTouchStart = thisTouchStart;
					screen.isDragging = false;
					screen.controller.save();
					e.preventDefault();
					return false;
				}, false);
			}
			screen.putControl = putControl;

			screen.buildTitleBar('Edit');

			var nameEdit = document.createElement('input');
			screen.dom.nameEdit = nameEdit;
			var disableNameSave = false;
			screen.setNameWithoutSave = function(newName) {
				disableNameSave = true;
				nameEdit.value = newName;
				disableNameSave = true;
			};
			var saveTimeoutID;
			var saveTimeoutDelay = 300;
			screen.dom.nameEdit.addEventListener('change', function(e) {
				if(saveTimeoutID) window.clearTimeout(saveTimeoutID);
				saveTimeoutID = window.setTimeout(function () {
					screen.controller.name(nameEdit.value);
				}, saveTimeoutDelay);
			});
			screen.dom.titleBar.appendChild(nameEdit);

			screen.buildTitleButton(
				'screenEdit_gotoControl', 'Control',
				function() {
					screen.navigateTo('screenControl', screen.urlOptions);
					//navigate_screenControl(state.comPort, 'replace');
				}
			);

			screen.buildTitleButton(
				'screenEdit_gotoTerminal', 'Terminal',
				function() {
					screen.navigateTo('screenTerminal', screen.urlOptions);
				}
			);

			screen.buildTitleButton(
				'screenEdit_delete', 'Delete',
				function() {
					deleteControl();
				},
				false
			);

			screen.buildTitleButton(
				'screenEdit_properties', 'Properties',
				function() {
					var control = selectedControl;
					if(control) screen.navigateTo('screenEditProperties', {control: control});
				},
				false
			);

			screen.buildTitleButton(
				'screenEdit_addControl',
				'+',
				function() {
					//var controlMenu = document.getElementById('screenEdit_addControlMenu');
					var addControlButton = document.getElementById('screenEdit_addControl');
					addControlMenu.style.top = addControlButton.offsetTop + addControlButton.offsetHeight;
					addControlMenu.style.left = addControlButton.offsetLeft;
					if(addControlMenu.style.display === 'none') addControlMenu.style.display = 'block';
					else addControlMenu.style.display = 'none';
					//document.getElementById('screenEdit_addControlMenu').style.display = 'true';
				}
			);

			var addControlMenu = document.createElement('div');
			addControlMenu.id = 'screenEdit_addControlMenu';
			addControlMenu.style.cssText = 'position: absolute; border: 1px solid black; border-radius: 3px; display: none; background-color: #ffffff;';
			var h1 = document.createElement('h1');
			h1.textContent = 'Controls';
			var addControlList = document.createElement('ul');

			addControlMenu.appendChild(h1);
			addControlMenu.appendChild(addControlList);
			div.appendChild(addControlMenu);

			screen.dom.addControlMenu = addControlMenu;
			screen.dom.addControlList = addControlList;

			//var svg = document.createElement('svg');
			var svg = createSVGElement('svg');
			screen.dom.svg = svg;
			svg.id = 'screenEdit_svg';
			//svgAttr(svg, 'xmlns', 'http://www.w3.org/2000/svg');
			//svgAttr(svg, 'xmlns:xlink', 'http://www.w3.org/1999/xlink');
			svgAttr(svg, 'viewBox', '0 0 2000 1000');
			div.appendChild(svg);



			function getControlTypeListElement(controlDefinition) {
				var definition = controlDefinition;
				var li = document.createElement('li');
				li.className = 'clickable';
				var h2 = document.createElement('h2');
				h2.textContent = definition.displayName;
				li.appendChild(h2);
				li.addEventListener('click', function(e) {
					//var menuDiv = document.getElementById('screenEdit_addControlMenu');
					//menuDiv.style.display = 'none';
					addControlMenu.style.display = 'none';

					var newControl = new Control(definition, 200, 200);
					screen.controller.addControl(newControl);
					screen.putControl(newControl);
				});
				return li;
			}

			// fill add control menu
			var controlListFragment = document.createDocumentFragment();
			controlDefinitions.forEach(function(definition, index) {
				var li = getControlTypeListElement(definition);
				if(index % 2) li.className += " even";
				else li.className += " odd";
				controlListFragment.appendChild(li);
			});
			addControlList.appendChild(controlListFragment);



			
			svg.addEventListener('mousemove', function(e) {
				if(screen.isDragging) {
					var scaleFactor = getControlScale(svg);
					/*
					if(svg.offsetWidth > 2*svg.offsetHeight) {
						// width is in excess; height controls scale
						scaleFactor = 1000 / svg.offsetHeight;
					} else {
						// height is in excess; width controls scale
						scaleFactor = 2000 / svg.offsetWidth;
					}
					*/
					var dX = e.clientX - screen.lastDragPosition.x;
					var dY = e.clientY - screen.lastDragPosition.y;
					screen.selectedControl.translate(scaleFactor * dX, scaleFactor * dY);
					screen.lastDragPosition = {x: e.clientX, y: e.clientY};
					e.preventDefault();
					return false;
				} 
			}, false);

			svg.addEventListener('click', function(e) {
				screen.clearSelection();
			}, false);


			//svg.xmlns = 'http://www.w3.org/2000/svg';
			//svg.xmlns:xlink='http://www.w3.org/1999/xlink';
			//svg.viewbox='0 0 2000 1000'

		},
		makeURL: function(urlOptions) {
			var url = '/screenEdit';
			var pieces = ['botID', 'port', 'controllerID'];
			pieces.forEach(function(piece) {
				url += '/' + piece + '/' + urlOptions[piece];
			});

			return url;
		},
		onNavigateTo: function(screen, urlOptions, otherOptions) {
			// options: comPort
			// state: hostname

			//if(!state.controller) {
				//fresh, need controller
				//Controller.fetch(historyState.hostname, options.comPort, function(controller) {
				//historyState.controllerID = urlOptions.controllerID;
				console.log('fetch by id ' + urlOptions.controllerID);
				Controller.fetchByID(urlOptions.controllerID, function(controller) {
					if(!controller) {
						console.log('couldn\'t fetch controller');
						//screen.controller = new Controller(historyState.hostname, options.comPort);
					} else {
						screen.controller = controller;
					}

					theRest();
				});
			//} else {
			//	// can do it directly
			//	screen.controller = state.controller;
			//	theRest();	
			//}

			shortcut.add('Delete', screen.deleteControl);

			function theRest() {
				//state.controller = screen.controller;
				screen.clearSelection();
				//var editSVG = document.getElementById('screenEdit_svg');
				var editSVG = screen.dom.svg;
				var controllerName = screen.controller.name();
				if(controllerName) screen.setNameWithoutSave(screen.controller.name());
				else screen.setNameWithoutSave('');
				//clearChildren(editSVG);
				clearSVG(editSVG);
				screen.controller.controls.forEach(function(control) {
					screen.putControl(control);
				});


				//historyState.comPort = options.comPort;
				//if(dontPushState === 'replace') history.replaceState(state, '', '/screenEdit/' + comPort);
				//else if(!dontPushState) history.pushState(state,'','/screenEdit/' + comPort);
				//switchScreen('screenEdit');
			}



		},
		onNavigateFrom: function(screen) {
			shortcut.remove('Delete');
		}
	};
});