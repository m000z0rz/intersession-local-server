// screen control
defineScreen(function () {
	return {
		name: 'screenControl',
		full: true,
		onResize: function(screen) {
			var svg = screen.dom.svg;
			var titleBar = screen.dom.titleBar;
			svg.style.height = window.innerHeight - titleBar.offsetHeight;
		},
		buildDOM: function (screen, div) {
			screen.buildTitleBar('Control');
			screen.buildTitleButton(
				'screenControl_gotoEdit', 'Edit',
				function() {
					screen.navigateTo('screenEdit');
					//navigate_screenControl(state.comPort, 'replace');
				}
			);

			screen.buildTitleButton(
				'screenEdit_gotoTerminal', 'Terminal',
				function() {
					screen.navigateTo('screenTerminal');
				}
			);

			//var svg = document.createElement('svg');
			var svg = createSVGElement('svg');
			screen.dom.svg = svg;
			svg.id = 'screenEdit_svg';
			//svgAttr(svg, 'xmlns', 'http://www.w3.org/2000/svg');
			//svgAttr(svg, 'xmlns:xlink', 'http://www.w3.org/1999/xlink');
			svgAttr(svg, 'viewbox', '0 0 2000 1000');
			div.appendChild(svg);


		},
		onNavigateTo: function(screen, options) {
			if(!state.screenName) {
				//fresh, need controller
				Controller.fetch(state.hostname, options.comPort, function(controller) {
					if(!controller) {
						screen.controller = new Controller(state.hostname, options.comPort);
					} else {
						screen.controller = controller;
					}
					
					afterGetController();
				});
			} else {
				// can do it directly
				afterGetController();
				
			}

			function afterGetController() {
				Bluetooth.openPort(options.comPort, function(data) {
					theRest();
				});
			}



			function theRest() {
				// just to be sure
				if(screen.controlInterface) screen.controlInterface.clearEvents();

				screen.controlInterface = new ControlInterface(options.comPort);

				var controlSVG = screen.dom.svg;
				clearSVG(controlSVG);
				//clearChildren(controlSVG);

				screen.controller.controls.forEach(function(control) {
					screenControl_putControl(control);
				});

				state.comPort = options.comPort;
				//if(dontPushState === 'replace') history.replaceState(state, '', '/screenControl/' + comPort);
				//else if(!dontPushState) history.pushState(state,'','/screenControl/' + comPort)
				//switchScreen('screenControl');
			}


			function putControl(control) {
				var svg = screen.dom.svg;
				var g = control.buildForControl(screen.controlInterface);
				svg.appendChild(g);
			}
		},
		onNavigateFrom: function(screen) {
			if(screen.controlInterface) screen.controlInterface.clearEvents();
		}
	};
});