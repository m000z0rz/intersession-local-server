// screen terminal

/*

	<div id='screenTerminal' class='screen full menu' style='padding: 0px;'>
		<h1 id='screenTerminal_header'>Terminal</h1>
		<div id='screenTerminal_terminal' class='terminal'
				></div>
		<div id='screenTerminal_footer'
				style='position: absolute; bottom: 0px; height: 60px; box-sizing: border-box; width: 100%;'>
			<input id='screenTerminal_input' type='text' style='border: 1px solid #333333; width: 80%;' /> <button id='screenTerminal_send'>Send</button>
			<br/>
			<label for='screenTerminal_autoscroll'>Autoscroll</label><input type='checkbox' id='screenTerminal_autoscroll' checked />
			<span style='padding-left: 40px;'>
			<label for='screenTerminal_lineEnding'>Send newline (\n) on each send</label>
			<select id='screenTerminal_lineEnding'>
				<option value='no' default>No</option>
				<option value='yes'>Yes</option>
			</select>

		</div>
	</div>
*/

defineScreen(function (screen) {
	return {
		name: 'screenTerminal',
		full: true,
		menu: true,
		onResize: function(screen) {
			var terminal = screen.dom.terminal;
			var footer = screen.dom.footer;
			var terminalHeader = screen.dom.titleBar;
			//console.log('inner height ', window.innerHeight, ' footer ', footer.offsetHeight, ' header ', terminalHeader.offsetHeight);
			terminal.style.height = window.innerHeight - footer.offsetHeight - terminalHeader.offsetHeight - 20;
			//console.log('terminal height')
		},
		buildDOM: function (screen, div) {
			div.style.padding = '0px;';


			screen.buildTitleBar('Terminal');
			screen.buildTitleButton(
				'screenTerminal_gotoEdit', 'Edit',
				function() {
					screen.navigateTo('screenEdit');
					//navigate_screenControl(state.comPort, 'replace');
				}
			);

			screen.buildTitleButton(
				'screenTerminal_gotoControl', 'Control',
				function() {
					screen.navigateTo('screenControl');
				}
			);

			var terminal = document.createElement('div');
			terminal.id = 'screenTerminal_terminal';
			terminal.className = 'terminal';
			screen.dom.terminal = terminal;
			div.appendChild(terminal);

			var footer = document.createElement('div');
			footer.id = 'screenTerminal_footer';
			footer.innerHTML = "<input id='screenTerminal_input' type='text' style='border: 1px solid #333333; width: 80%;' /> <button id='screenTerminal_send'>Send</button>    <br/>    <label for='screenTerminal_autoscroll'>Autoscroll</label><input type='checkbox' id='screenTerminal_autoscroll' checked />    <span style='padding-left: 40px;'>    <label for='screenTerminal_lineEnding'>Send newline (\\n) on each send</label>    <select id='screenTerminal_lineEnding'>    <option value='no' default>No</option>    <option value='yes'>Yes</option>    </select>";
			screen.dom.footer = footer;





			//var terminal = document.getElementById('screenTerminal_terminal');
			var terminalSendButton = footer.querySelector('#screenTerminal_send');
			var terminalInput = footer.querySelector('#screenTerminal_input');
			var terminalHistory = [];
			var terminalHistoryIndex = 0;
			var terminalHistoryMaxItems = 20;
			var thisFromTerminal = false;



			var terminalSend = function() {
				var toSend = terminalInput.value;

				terminalHistory.push(toSend);
				toSend = unescapeForSerial(toSend);

				if(footer.querySelector('#screenTerminal_lineEnding').value === 'yes')
					toSend += '\n';

				console.log('terminal send ', toSend);

				thisFromTerminal = true;
				Bluetooth.sendOnPort(state.comPort, toSend);
				thisFromTerminal = false;

				if(terminalHistory.length > terminalHistoryMaxItems) terminalHistory = terminalHistory.slice(terminalHistory.length - terminalHistoryMaxItems, terminalHistoryMaxItems);
				terminalHistoryIndex = terminalHistory.length;

				terminalInput.value = '';
				terminalInput.focus();
			};

			terminalSendButton.addEventListener('click', terminalSend, false);

			terminalInput.addEventListener('keypress', function(e) {
				if(e.keyCode === 13) {
					terminalSend();
				} else {
					terminalHistoryIndex = terminalHistory.length;
				}
			}, false);

			// can't catch up arrow in keypress
			terminalInput.addEventListener('keydown', function(e) {
				if(e.keyCode === 38) { // up arrow
					//console.log('history up');
					terminalHistoryIndex -= 1;
					if(terminalHistoryIndex < 0) terminalHistoryIndex = 0;
					if(terminalHistory[terminalHistoryIndex]) terminalInput.value = terminalHistory[terminalHistoryIndex];
				} else if(e.keyCode === 40) { // down arrow
					terminalHistoryIndex += 1;
					if(terminalHistoryIndex > terminalHistory.length) terminalHistoryIndex = terminalHistory.length;
					if(terminalHistory[terminalHistoryIndex]) terminalInput.value = terminalHistory[terminalHistoryIndex];
					else terminalInput.value = '';
				}
			});


			var lastTerminalElement;
			var lastTerminalSource;

			//var terminal = document.getElementById('screenTerminal_terminal');
			var targetTerminalElement;
			var makeTerminalOnData = function(source) {
				return function(data) {
					if(data.portName === state.comPort) {
						terminalAddData(source, data.serialData);
					}
				};
			};

			var terminalAddData = function(source, string) {
				if(source === 'this' && thisFromTerminal) source = 'terminal';
				if(lastTerminalSource === source) {
					targetTerminalElement = lastTerminalElement;
				} else {
					targetTerminalElement = document.createElement('span');
					if(source === 'rx') targetTerminalElement.style.color = 'olivedrab';
					if(source === 'other') targetTerminalElement.style.color = 'navy';
					if(source === 'this') targetTerminalElement.style.color = 'indianred';
					if(source === 'terminal') targetTerminalElement.style.color = 'firebrick';
					lastTerminalSource = source;
					lastTerminalElement = targetTerminalElement;
					terminal.appendChild(targetTerminalElement);
				}

				var lines = string.split('\n');
				lines.forEach(function(line, index) {
					targetTerminalElement.appendChild(document.createTextNode(line));
					if(index !== lines.length-1) {
						targetTerminalElement.appendChild(document.createElement('br'));
					}
				});
				var autoscroll = footer.querySelector('#screenTerminal_autoscroll').checked;
				if(autoscroll) terminal.scrollTop = terminal.scrollHeight;
			};


			Bluetooth.on('receiveOnPort', makeTerminalOnData('rx'));
			Bluetooth.on('otherSent', makeTerminalOnData('other'));
			Bluetooth.on('thisSent', makeTerminalOnData('this'));

			/*
			Bluetooth.on('receiveOnPort', function(data) {
				console.log('rx ' + data.portName + ": ", data.serialData);
			});
			*/

		},
		onNavigateTo: function(screen, options) {
			Bluetooth.openPort(comPort, function(data) {
				theRest();
			});

			function theRest() {
				var titleBar = screen.dom.titleBar;
				//var header = document.getElementById('screenTerminal_header');
				//header.textContent = 'Terminal on ' + comPort;
				titleBar.textContent = 'Terminal on ' + options.comPort;
				state.comPort = options.comPort;
				//if(dontPushState === 'replace') history.replaceState(state, '', '/screenTerminal/' + comPort);
				//else if(!dontPushState) history.pushState(state,'','/screenTerminal/' + comPort)
				//switchScreen('screenTerminal');
				//var terminalInput = document.getElementById('screenTerminal_input');
				var terminalInput = screen.dom.footer.querySelector('#screenTerminal_input');
				terminalInput.focus();
			}
		},
		onNavigateFrom: function(screen) {
			//if(screen.controlInterface) screen.controlInterface.clearEvents();
		}
	};
});