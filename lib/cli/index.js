const
	cluster = require('../cluster'),
	vorpal = require('vorpal')(),
	basicCommands = require('./basic');

if(cluster.isMaster) {
	vorpal.ui.submit = function(line) {
		if (this._activePrompt) {
			this._activePrompt.rl.emit('line',line);
		}
		return this;
	}

	module.exports = function(instance, prompt) {
		basicCommands(vorpal,instance);
		vorpal.delimiter(`${prompt}> `).show();
		return {
			eval(line) {
				vorpal.ui.submit(line);
			}
		}
	}
}
else {
	module.exports = function(instance, prompt) {
		basicCommands(vorpal,instance);
	}
}
