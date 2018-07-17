const Component = require('../Component');

class Transporter extends Component {
	constructor(id,type) {
		super(id,type);
	}

	transport(entry, callback) {
		if(callback) callback(null,entry);
	}
}

module.exports = Transporter;
