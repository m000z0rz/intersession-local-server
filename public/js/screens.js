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
			h1.style = 'display: inline;';
			h1.textContent = title;
			titleBar.appendChild(h1);

			screen.dom.div.appendChild(titleBar);
		};

		screen.buildTitleButton = function(id, title, onClick) {
			var titleButton = document.createElement('span');
			titleButton.id = id;
			titleButton.className = 'titleIconButton';
			titleButton.title = title;

			titleButton.addEventListener('click', onClick);
			titleButton.addEventListener('touchstart', onClick);

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
		screens.forEach(function(screen) {
			if(screen.name !== toScreen)  {
				domScreen = screen.div;
				if(domScreen) {
					domScreen.style.opacity = 0;
					domScreen.style.display = 'none';
				}
			} else {
				domScreen = screen.dom.div;
				domScreen.style.opacity = 1;
				domScreen.style.display = 'block';
			}
		});

		state.screenName = toScreen;

		//onResize();
	}

	function navigateTo(screenName, options, pushState) {
		console.log('navigateTo ', screenName);
		var screen = screenMap[screenName];
		if(pushState === undefined) pushState = true;

		if(screen) {
			if(currentScreen && currentScreen.definition.onNavigateFrom) currentScreen.definition.onNavigateFrom(currentScreen);
			if(screen.definition.onNavigateTo) screen.definition.onNavigateTo(screen, options);
		}

		// need to encode options
		console.log('state ', state, ' screenName ', screenName);
		if(pushState) history.pushState(state, '', '/' + screenName + '/');
		switchScreen(screen);
		currentScreen = screen;

		//if(dontPushState === 'replace') history.replaceState(state, '', '/screenEdit/' + comPort);
		//else if(!dontPushState) history.pushState(state,'','/screenEdit/' + comPort)
		switchScreen(screenName);
	}
	Screens.navigateTo = navigateTo;

	function onResize() {
		screens.forEach(function(screen) {
			if(screen.definition.onResize) screen.definition.onResize(screen);
		});
	}

	Screens.onResize = onResize;


	window.onResize = onResize;

	window.defineScreen = defineScreen;

	window.Screens = Screens;

}) (document.getElementById('screensDiv'));