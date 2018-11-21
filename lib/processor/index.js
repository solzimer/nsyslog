const Component = require('../component');

class Processor extends Component {
	constructor(id,type) {
		super(id,type);
	}

	process(entry,callback) {
		callback(null,entry);
	}

	push(entry,callback) {
		callback();
	}
}

module.exports = Processor;
