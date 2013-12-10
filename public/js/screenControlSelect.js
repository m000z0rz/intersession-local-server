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
				selectedControl = undefined;
				document.getElementById('screenEdit_properties').className = 'titleIconButtonDeactivated';
				document.getElementById('screenEdit_delete').className = 'titleIconButtonDeactivated';
			}
			screen.clearSelection = clearSelection;


			function selectControl(control) {
				var oldControl = screenEdit_selectedControl;
				if(oldControl) oldControl.element.style.opacity = 1;
				screenEdit_selectedControl = control;
				control.element.style.opacity = 0.5;
				document.getElementById('screenEdit_properties').className = 'titleIconButton';
				document.getElementById('screenEdit_delete').className = 'titleIconButton';
			}
			screen.selectControl = selectControl;

			screen.buildTitleBar('Edit');
			screen.buildTitleButton(
				'screenEdit_gotoControl', 'Control',
				function() {
					screen.navigateTo('screenControl');
					//navigate_screenControl(state.comPort, 'replace');
				}
			);

			screen.buildTitleButton(
				'screenEdit_gotoTerminal', 'Terminal',
				function() {
					screen.navigateTo('screenTerminal');
				}
			);

			screen.buildTitleButton(
				'screenEdit_delete', 'Delete',
				function() {
					deleteControl();
				},
				false
			);

			screen.buildTitleButon(
				'screenEdit_properties', 'Properties',
				function() {
					var control = selectedControl;
					if(control) navigate('screenEditProperties', [control]);
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


			document.getElementById('screenControlSelect_Edit').addEventListener('click', function(e) {
				navigate_screenEdit(state.comPort);
			}, false);

			document.getElementById('screenControlSelect_Control').addEventListener('click', function(e) {
				navigate_screenControl(state.comPort);
			}, false);

			document.getElementById('screenControlSelect_Terminal').addEventListener('click',
				function(e) {
					navigate_screenTerminal(state.comPort);
				}, false);



		},
		onNavigateTo: function(screen, options) {
			var comPort = options.comPort;
			Controller.fetch(state.hostname, options.comPort, function(controller) {
				if(!controller) {
					screen.controller = new Controller(state.hostname, options.comPort);
				} else {
					screen.controller = controller;
				}

				var domCOMID = screen.dom.div.querySelector('#screenControlSelect_COM');
				domCOMID.textContent = comPort;
				state.comPort = comPort;

				//console.log('screen control select ', state);
				//if(!dontPushState) history.pushState(state,"",'/screenControlSelect/' + comPort)
				//switchScreen('screenControlSelect');
			});
		},
		onNavigateFrom: function(screen) {

		}
	};
});