## Generic Parser

Parse the entry following a state machine JSON ruleset, giving structure to a text message. Rulesets are based on [Ace Editor Syntax Higlighters](https://ace.c9.io/#nav=higlighter) (and they are based on TextMate grammars).

## Ruleset Syntax
Rulesets are JSON files that describes a state machine that will run over a line (or multiple lines) of text, finding tokens and assigning them to entry fields.

The first state is always **start**:

###Example
```javascript
// We want to parse lines that follows the following syntax:
// 2018-01-01T20:00:00 host1 127.0.0.1 => This is the message body 1
// 2018-01-01T20:00:00 host2 127.0.0.1 => This is the message body 2
// 2018-01-01T20:00:00 hostname 127.0.0.1 => This is the message body 3
{
	// First state is always "start"
	"start": [
		{
			"description": "Timestamp",	// description is only for informational purpose
			"name": "timestamp",				// Name of the field to be assigned
			"regex": "^(\\d+\\-\\d+\\-\\d+T\\d+:\\d+:\\d+(\\.\\d+)?(Z)?)",	// Regular expression to be matched
			"next" : "hostname"	// Next state after timestamp is "hostname"
		}
	],

	"hostname" : [
		{
			"description": "Source hostname",
			"name" : "hostname",
			"regex" : "[a-zA-Z][^ =>]+",
			"next" : "ipaddr"
		}
	],

	// Parser will be in "ipaddr" state until it finds a "=>" token.
	// Rules order is very important since first matched will be used
	"ipaddr": [
		{
			"description": "Source IP address",
			"name": "ipaddr",
			"regex" : "\\d+\\.\\d+\\.\\d+\\.\\d+"
		},
		{
			"description" : "Jump state",
			"name" : null,
			"regex" : "=>",
			"next" : "body"
		}
	],

	"body" : [
		{
			"description" : "Message body",
			"name" : "body",
			"regex" : ".*",
			"next" : "start"	// We have reached the end of the line, return to "start"
		}
	]
}
```

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

You can see more examples on [github](https://github.com/solzimer/nsyslog/tree/master/multilang)
