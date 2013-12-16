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
					screen.navigateTo('screenEdit', {comPort: historyState.comPort});
					//navigate_screenControl(state.comPort, 'replace');
				}
			);

			screen.buildTitleButton(
				'screenEdit_gotoTerminal', 'Terminal',
				function() {
					screen.navigateTo('screenTerminal', {comPort: historyState.comPort});
				}
			);

			//var svg = document.createElement('svg');
			var svg = createSVGElement('svg');
			screen.dom.svg = svg;
			svg.id = 'screenControl_svg';
			//svgAttr(svg, 'xmlns', 'http://www.w3.org/2000/svg');
			//svgAttr(svg, 'xmlns:xlink', 'http://www.w3.org/1999/xlink');
			svgAttr(svg, 'viewBox', '0 0 2000 1000');
			div.appendChild(svg);


		},
		onNavigateTo: function(screen, options) {
			// options: comPort
			// state: hostname
			if(!state.controller) {
				console.log('controller fetch');
				//fresh, need controller
				Controller.fetch(historyState.hostname, options.comPort, function(controller) {
					if(!controller) {
						screen.controller = new Controller(historyState.hostname, options.comPort);
					} else {
						screen.controller = controller;
					}
					
					afterGetController();
				});
			} else {
				console.log('controller from state');
				// can do it directly
				screen.controller = state.controller;
				afterGetController();	
			}

			function afterGetController() {
				state.controller = screen.controller;
				Bluetooth.openPort(options.comPort, function(data) {
					theRest();
				});
			}



			function theRest() {
				console.log('opening port');
				// just to be sure
				if(screen.controlInterface) screen.controlInterface.clearEvents();

				screen.controlInterface = new ControlInterface(options.comPort);

				var controlSVG = screen.dom.svg;
				clearSVG(controlSVG);
				//clearChildren(controlSVG);

				screen.controller.controls.forEach(function(control) {
					//screenControl_putControl(control);
					putControl(control);
				});

				historyState.comPort = options.comPort;
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