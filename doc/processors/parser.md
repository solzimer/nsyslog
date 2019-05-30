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
Use of the previous parser with 4 cores. Extracted values will be stored in a map
```json
"processors" : {
	"parselog" : {
		"type" : "parser",
		"config" : {
			"path" : "logparser.json",
			"map" : true,
			"input" : "${originalMessage}",
			"output" : "parsedData"
		}
	}
}
```

## Configuration parameters
* **path** : Path to the parser file.
* **cores** : Number of parallel instances to be run (if supported by nodejs)
* **map** : If true, parsed data will be stored as a map object. Otherwise, it will be an array.
* **singleval** : Some parsed elements can have multiple values with the same name. When singleval is true, only takes the first element of each name.
* **input** : Input expression to be parsed.
* **output** : Output field.
* **extend** : By default *false*. When set, input object will be extended by the generated properties. Otherwise, it will be replaced with a new object containing only the generated properties.
* **deep** : By default *false*. When set, and **extend** enabled, generated properties will be merged if their destination already exists. Otherwise, the destination field will be replaced with the newly generated properties.
