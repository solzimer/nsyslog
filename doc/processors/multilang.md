## Multilang Processor

Multilang processors allows the use of [Apache Storm Multilang](http://storm.apache.org/releases/1.1.2/Multilang-protocol.html) protocol to call external components for data processing (Apache Storm Bolts).

This way, it's possible to create external scripts in any language that process the data in an asynchronous, parallell and/or multi-core way.

## Examples
Use of a external script written in NodeJS. Will spawn 4 processes that process data in a round-robin fashion (shuffle).
```json
"processors" : {
	"tokenize" : {
		"type" : "multilang",
		"config" : {
			"path" : "node multilang/js/tokenize.js",
			"cores" : 4,
			"wire" : "shuffle",
			"module" : false,
			"input" : "${tuple}",
			"output" : "tuple",
			"options" : {
				"max" : 10
			}
		}
	}
}
```

Use of a module script written in NodeJS. Will spawn 2 processes that process data grouped by the *filename* property.
```json
"processors" : {
	"tokenize" : {
		"type" : "multilang",
		"config" : {
			"path" : "multilang/js/tokenize.js",
			"cores" : 2,
			"wire" : "group",
			"module" : false,
			"input" : "${tuple}",
			"output" : "tuple",
			"field" : "${filename}",			
			"options" : {
				"max" : 10
			}
		}
	}
}
```

## Configuration parameters
* **path** : Command line of the process to execute, or file path if *module* mode is used.
* **cores** : Number of parallell instances to be run
* **wire** : Can be either *shuffle* or *group*. When *shuffle* is used, each data object will be sent randomly to one of the instanced processes. Alternatively, when *group* is used, all objects with the same *field* value will be sent to the same process instance.
* **module** : Only available if the script is written in NodeJS and exports a Bolt component. When *true*, *path* parameter only specifies the script path, and, instead of spawn new processes, multiple bolt instances are created in the main process.
* **input** : Expression used to access a tuple array in the entry data. Input data for multilang components mus be a flat array of values.
* **output** : Output field for the multilang component.
* **field** : Expression used when *group* mode is used.
* **options** : JSON object passed to configure the multilang component.

## Multilang component examples:

```javascript
const {BasicBolt} = require('./storm');

class SplitBolt extends BasicBolt {
	constructor() {
		super();
	}

	initialize(conf, context, callback) {
		// Configuration received from the config file
		this.max = conf.max;
		callback();
	}

	process(tup, done) {
		// Split the first tuple value
		var words = tup.values[0].split(" ").splice(0,this.max);

		// For each splitted word, emit a new tuple
		words.forEach((word) => {
			this.emit(
				{tuple: [word], anchorTupleId: tup.id},
				(taskIds)=>{
					this.log(word + ' sent to task ids - ' + taskIds);
      	}
			);
		});

		// Ack the tuple without errors
		done();
	}
}

// Export module so can be used internally without needing to
// spawn a new process
if(module.parent) {
	module.exports = SplitBolt;
}
else {
	new SplitBolt().run();
}
```

```python
import storm

class SplitSentenceBolt(storm.BasicBolt):
    def process(self, tup):
        words = tup.values[0].split(" ")
        for word in words:
          storm.emit([word])

SplitSentenceBolt().run()
```
