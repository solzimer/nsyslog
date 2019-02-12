const Component = require('../component');

class Input extends Component {
	constructor(id,type) {
		super(id,type);
	}

	get mode() {
		return MODE.push;
	}

	async watermarks() {
		return [];
	}

	next(callback) {

	}
}

Input.MODE = {
	push:"push",
	pull:"pull"
}


module.exports = Input;
