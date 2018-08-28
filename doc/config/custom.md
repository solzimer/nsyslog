## Custom components

NSyslog ships with a core set of inputs, processors and transporters, but you may need other components no present in this set. You may need, for example, an input from a propietary endpoint, derivate data using you own formulas, etc...

That is why NSyslog allows registering and using custom components (inputs, processors and transporters). Implementing a NSyslog component is pretty easy. You only have to implement the interface of the core component, and code whatever needs to be done.

### Core component
Inputs, processors and transporters are subclasses of **Component**. Let's take a look to the **Component** class:

```javascript
class Component extends EventEmiter {
	constructor(id,type) {
		super();
		this.id = id;
		this.type = type;
	}

	configure(cfg,callback) {
		callback();
	}

	start(callback) {
		callback();
	}

	pause(callback) {
		callback();
	}

	resume(callback) {
		callback();
	}

	stop(callback) {
		callback();
	}

	key(entry) {
		//....
	}
}
```

As you can see, the majority of the methods receive a *callback* function as their last argument. This allows for async method execution. When the method is done with its job, it must call the callback function following the NodeJS convention (error as first argument)

Every compoment must implement the following methods:

* **configure** : It receives the component *config* object, declared in the configuration file. This will allow the component to be configured **before** it is started.
* **start** : Starts the component. In case of push inputs, it will use the callback function to send the entries.
* **pause** : Pauses the component
* **resume** : Resumes a paused component
* **stop** : Stop the component, releasing its resources.
* **key** : This is a special method that will return a string that represents a summary of an entry. It's optional, and really meant to be used by input components.

### Inputs
As seen before, inputs can be *pull* or *push* inputs. This is its interface:
```javascript
class Input extends Component {
	constructor(id,type) {
		super(id,type);
	}

	get mode() {
		return MODE.push;
	}

	next(callback) {

	}
}

Input.MODE = {
	push:"push",
	pull:"pull"
}
```

Inputs have two additional methods:
* **mode** : Returns if the input is *push* or *pull*
* **next** : Used with *pull* inputs. Request a new entry.

#### Examples:
Push input:
```javascript
const Input = require('nsyslog').Core.Input

class MyPushInput extends Input {
	constructor(id) {
		super(id);
		this.paused = false;
		this.ival = null;
	}

	configure(config,callback) {
		config = config || {};
		this.interval = parseInt(config.interval) || 100;
		this.threshold = parseFloat(config.threshold) || 0.5;
		callback();
	}

	get mode() {
		return Input.MODE.push;
	}

	start(callback) {
		this.ival = setInterval(()=>{
			if(this.paused) return;

			let rnd = Math.random();
			if(rnd < this.threshold)
				callback(null,{originalMessage : `This is a push input: ${rnd}`});
			else
				callback(`Threshold error: ${rnd}`);
		}, this.interval);
	}

	stop(callback) {
		clearInterval(this.ival);
		callback();
	}

	pause(callback) {
		this.paused = true;
		callback();
	}

	resume(callback) {
		this.paused = false;
		callback();
	}

	key(entry) {
		return `${this.id}@mypush`;
	}
}

module.exports = MyPushInput;
```

Pull input:
```javascript
const Input = require('nsyslog').Core.Input

class MyPullInput extends Input {
	constructor(id) {
		super(id);
		this.paused = false;
	}

	configure(config,callback) {
		config = config || {};
		this.interval = parseInt(config.interval) || 100;
		this.threshold = parseFloat(config.threshold) || 0.5;
		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	next(callback) {
		setTimeout(()=>{
			let rnd = Math.random();
			if(rnd < this.threshold)
				callback(null,{originalMessage : `This is a pull input: ${rnd}`});
			else
				callback(`Threshold error: ${rnd}`);
		}, this.interval);
	}

	key(entry) {
		return `${this.id}@mypush`;
	}
}

module.exports = MyPullInput;
```

Configuration:
```JSON
{
	"register" : [
		{"type":"input","id":"mypush","require":"custom/mypushinput.js"},
		{"type":"input","id":"mypull","require":"custom/mypushinput.js"}
	],

	"inputs" : {
		"pusher" : {
			"type" : "mypush",
			"config" : {
				"interval" : 100,
				"threshold" : 0.3
			}
		},
		"puller" : {
			"type" : "mypull",
			"config" : {
				"interval" : 100,
				"threshold" : 0.3
			}
		}
	}
}
```

### Processors
This is the Processor interface:
