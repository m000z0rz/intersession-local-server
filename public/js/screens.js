(function (toDiv)  {
	//screenDefinitions = [];
	//screenDefinitionMap = {};

	screens = [];
	screenMap = {};

	var currentScreen;
	var screensDiv = document.createElement('div');
	toDiv.appendChild(screensDiv);

	function defineScreen(func) {
		screenDef = func();
		//screenDefinitions.push(screenDef);
		//screenDefinitionMap[screenDef.name] = screenDef;

		var screen = {};
		screen.definition = screenDef;
		screen.name = screen.definition.name;
		screens.push(screen);
		screenMap[screen.name] = screen;


		screen.buildTitleBar = function(title) {
			var titleBar = document.createElement('div');
			titleBar.className = 'titleBar';
			screen.dom.titleBar = titleBar;

			var h1 = document.createElement('h1');
			h1.style.display = 'inline';
			//console.log('h1 style? ' + h1.style);
			//console.log(h1);
			h1.textContent = title;
			titleBar.appendChild(h1);

			screen.dom.div.appendChild(titleBar);
		};

		screen.buildTitleButton = function(id, title, onClick) {
			var titleButton = document.createElement('span');
			titleButton.id = id;
			titleButton.className = 'titleIconButton';
			titleButton.textContent = title;

			//titleButton.addEventListener('click', onClick);
			//titleButton.addEventListener('touchstart', onClick);
			addPointerListeners(titleButton, ['click', 'touchstart'], onClick);

			screen.dom.titleBar.appendChild(titleButton);


		};

		screen.navigateTo = navigateTo;
		screen.dom = {};



	}

	Screens = {};

	Screens.buildDOM = function() {
		screens.forEach(function(screen) {
			var div = document.createElement('div');
			div.className = 'screen';
			if(screen.definition.full === true) div.className += ' full';
			if(screen.definition.menu === true) div.className += ' menu';
			screen.dom.div = div;
			screen.definition.buildDOM(screen, div);
			screensDiv.appendChild(div);
		});
	};


	function switchScreen(toScreen) {
		var domScreen;
		//console.log('switch to ' + toScreen);
		screens.forEach(function(screen) {
			//console.log('test "', screen.name, '"?="', toScreen, '"');
			if(screen.name !== toScreen)  {
				//console.log('hiding ' + screen.name);
				domScreen = screen.dom.div;
				if(domScreen) {
					domScreen.style.opacity = 0;
					domScreen.style.display = 'none';
				}
			} else {
				//console.log('showing ' + screen.name);
				domScreen = screen.dom.div;
				domScreen.style.opacity = 1;
				domScreen.style.display = 'block';
			}
		});

		historyState.screenName = toScreen;

		//onResize();
	}

	function navigateTo(screenName, options, pushState) {
		//console.log('navigateTo ', screenName);
		var screen = screenMap[screenName];
		if(pushState === undefined) pushState = true;

		if(screen) {
			if(currentScreen && currentScreen.definition.onNavigateFrom) {
				//console.log('onNavigateFrom for ', currentScreen);
				currentScreen.definition.onNavigateFrom(currentScreen);
			}
			if(screen.definition.onNavigateTo) {
				//console.log('onNavigateTo for ', screen);
				screen.definition.onNavigateTo(screen, options);
			}
		}

		// need to encode options
		//console.log('state ', state, ' screenName ', screenName);
		if(pushState) history.pushState(historyState, '', '/' + screenName + '/');
		//switchScreen(screen);
		currentScreen = screen;

		//if(dontPushState === 'replace') history.replaceState(state, '', '/screenEdit/' + comPort);
		//else if(!dontPushState) history.pushState(state,'','/screenEdit/' + comPort)
		//console.log('will call switchScreen');
		switchScreen(screenName);
		//console.log('on switchScreen');
	}
	Screens.navigateTo = navigateTo;

	function onResize() {
		//console.log('onResize called');
		screens.forEach(function(screen) {
			//console.log('resize ' + screen.name + '?');
			if(screen.definition.onResize) {
				//console.log('  resize!');
				screen.definition.onResize(screen);
			}
		});
	}

	Screens.onResize = onResize;


	window.onresize = onResize;
	//console.log('set onResize to ', onResize);
	//console.log(window.onresize);

	window.defineScreen = defineScreen;

	window.Screens = Screens;

}) (document.getElementById('screensDiv'));