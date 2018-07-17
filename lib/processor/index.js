const Component = require('../Component');

class Processor extends Component {
	constructor(id,type) {
		super(id,type);
	}

	process(entry,callback) {
		callback(null,entry);
	}
}

module.exports = Processor;
