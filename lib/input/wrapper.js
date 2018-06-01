const
	Input = require('./'),
	MODE = Input.MODE;

class InputWrapper extends Input {
	constructor(input) {
		super();
		this.input = input;
	}

	start(callback) {
		let input = this.input;
		if(input.mode==MODE.push) {
			input.start(callback);
		}
		else {
			let fn = function() {
				input.next((err,data)=>{
					callback(err,data);
					setImmediate(fn);
				});
			}
			input.start(fn);
		}
	}
}

module.exports = InputWrapper;
