const
	vorpal = require('vorpal')(),
	basicCommands = require('./basic');

vorpal.ui.submit = function(line) {
	if (this._activePrompt) {
		this._activePrompt.rl.emit('line',line);
	}
	return this;
}

module.exports = function(nsyslog, prompt) {
	basicCommands(vorpal,nsyslog);
	vorpal.delimiter(`${prompt}> `).show();
	return {
		eval(line) {
			vorpal.ui.submit(line);
		}
	}
}
