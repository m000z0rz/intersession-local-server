/*
	<div id="screenControlSelect" class="screen menu">
		<div id="controlSelect">
			<h1 id="screenControlSelect_COM"></h1>
			<small class="sub">Microsoft</small>
		</div>
		<ul>
			<li class="odd clickable" id="screenControlSelect_Control"><h2>Control</h2></li>
			<li class="even clickable" id="screenControlSelect_Edit"><h2>Edit</h2></li>
			<li class="odd clickable" id="screenControlSelect_Terminal"><h2>Terminal</h2></li>
			<li class="even"><h2>Bot ID <input type="text" value="01"></input></h2></li>
		</ul>
	</div>
*/

// screen edit
defineScreen(function (screen) {
	return {
		name: 'screenControlSelect',
		full: true,
		menu: true,
		onResize: function(screen) {
		},
		buildDOM: function (screen, div) {
			var header = document.createElement('div');
			header.id = 'screenControlSelect_header';

			var h1 = document.createElement('h1');
			h1.id = 'screenControlSelect_COM';
			screen.dom.com = h1;
			h1.textContent = '';
			header.appendChild(h1);

			//var small = document.createElement('small');
			div.appendChild(header);

			var menuList = document.createElement('ul');

			var buttonControl = document.createElement('li');
			buttonControl.className = 'odd clickable';
			buttonControl.id = 'screenControlSelect_Control';

			var h2;
			h2 = document.createElement('h2');
			h2.textContent = 'Control';
			buttonControl.appendChild(h2);
			menuList.appendChild(buttonControl);

			var buttonEdit = document.createElement('li');
			buttonEdit.className = 'even clickable';
			buttonEdit.id = 'screenControlSelect_Edit';

			h2 = document.createElement('h2');
			h2.textContent = 'Edit';
			buttonEdit.appendChild(h2);
			menuList.appendChild(buttonEdit);

			var buttonTerminal = document.createElement('li');
			buttonTerminal.className = 'odd clickable';
			buttonTerminal.id = 'screenControlSelect_Terminal';

			h2 = document.createElement('h2');
			h2.textContent = 'Terminal';
			buttonTerminal.appendChild(h2);
			menuList.appendChild(buttonTerminal);

			addPointerListeners(buttonControl, ['click', 'touchstart'], function(e) {
				screen.navigateTo('screenControl', {comPort: historyState.comPort});
			});
			addPointerListeners(buttonEdit, ['click', 'touchstart'], function(e) {
				screen.navigateTo('screenEdit', {comPort: historyState.comPort});
			});
			addPointerListeners(buttonTerminal, ['click', 'touchstart'], function(e) {
				screen.navigateTo('screenTerminal', {comPort: historyState.comport});
			});


			div.appendChild(menuList);




		},
		onNavigateTo: function(screen, options) {
			var comPort = options.comPort;

			Controller.fetch(historyState.hostname, options.comPort, function(controller) {
				if(!controller) {

					screen.controller = new Controller(historyState.hostname, comPort);
				} else {
					screen.controller = controller;
				}

				var domCOMID = screen.dom.com;
				domCOMID.textContent = comPort;
				historyState.comPort = comPort;

				state.controller = screen.controller;
				console.log('set state.controller ', state.controller);
			});
		},
		onNavigateFrom: function(screen) {

		}
	};
});