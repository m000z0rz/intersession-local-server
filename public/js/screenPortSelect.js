	/*
	<div id="screenPortSelect" class="screen menu">
		<div id="portListHeader">
			<h1>Ports<span id="hostname"></span></h1>
		</div>
		<ul id="portList"></ul>
	</div>
	*/

// screenPortSelect
defineScreen(function (screen) {
	return {
		name: 'screenPortSelect',
		full: true,
		menu: true,
		onResize: function(screen) {

		},
		buildDOM: function (screen, div) {
			var header = document.createElement('div');
			header.id = 'screenPortSelect_portListHeader';

			var h1 = document.createElement('h1');
			h1.textContent = 'Ports';

			var hostname = document.createElement('span');
			screen.dom.hostname = hostname;

			h1.appendChild(hostname);
			header.appendChild(h1);
			div.appendChild(header);

			var portList = document.createElement('ul');
			portList.id = 'screenPortSelect_portList';
			screen.dom.portList = portList;
			div.appendChild(portList);
		},
		onNavigateTo: function(screen, params) {
			// cache old comPort from state 
			Bluetooth.listPorts(function(data) {
				var ports = data.ports;

				var domHostname = screen.dom.hostname;
				var domList = screen.dom.portList;
				historyState.hostname = data.hostname;
				domHostname.textContent = " on " + data.hostname;

				clearChildren(domList);

				var fragment = document.createDocumentFragment();
				ports.forEach(function(port, index) {
					var li = getPortListElement(port);
					if(index % 2) li.className += " even";
					else li.className += " odd";
					fragment.appendChild(li);
				});

				domList.appendChild(fragment);

				//console.log('navigate_screenPortSelect state ', state);
				if(historyState && historyState.comPort) Bluetooth.closePort(historyState.comPort);

				//switchScreen('screenPortSelect');
			});

			// if this statement gets moved into callback, need to cache & refer
			//   to state.comPort; it will be overwritten with undefined when navigation
			//   is complete
			//console.log('navigate_screenPortSelect state ', state);
			if(historyState && historyState.comPort) Bluetooth.closePort(historyState.comPort);
			//if(dontPushState === 'replace') history.replaceState(state, '', '/screenPortSelect');
			//else if(!dontPushState) history.pushState(state,"",'/screenPortSelect');

			function getPortListElement(port) {
				//<li class="odd"><h2>COM1</h2><small class="sub">Microsoft</small></li>
				var li = document.createElement('li');
				li.className = 'clickable';
				var h2 = document.createElement('h2');
				h2.textContent = port.portName;
				var small = document.createElement('small');
				small.textContent = port.manufacturer || '';
				//port.isOpen
				small.className = 'sub';
				li.appendChild(h2);
				li.appendChild(small);
				li.addEventListener('click', function(e) {
					screen.navigateTo('screenControlSelect', {comPort: port.portName});
					//navigate_screenControlSelect(port.portName);
				});
				return li;
			}

		},
		onNavigateFrom: function(screen) {

		}
	};
});