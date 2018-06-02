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
			input.start((err,data)=>{
				if(data) data.id = input.id;
				callback(err,data);
			});
		}
		else {
			let fn = function() {
				input.next((err,data)=>{
					if(!err && !data) {
						setTimeout(fn,100);
					}
					else {
						if(data) data.id = input.id;
						callback(err,data);
						setImmediate(fn);
					}
				});
			}
			input.start(fn);
		}
	}
}

module.exports = InputWrapper;
