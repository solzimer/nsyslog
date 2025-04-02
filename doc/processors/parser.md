## Generic Parser

The Generic Parser processes log entries using a state machine JSON ruleset to extract structured data from text messages. Rulesets are based on [Ace Editor Syntax Highlighters](https://ace.c9.io/#nav=higlighter), which are derived from TextMate grammars.

## Ruleset Syntax

Rulesets are JSON files or inline configurations that describe a state machine to process text line by line (or across multiple lines). Each state defines a set of rules with regular expressions to match tokens and assign them to fields in the log entry.

### Key Elements of a Ruleset (File mode)
- **start**: The initial state of the parser.
- **regex**: A regular expression to match text.
- **name**: The field(s) to assign the matched value(s).
- **next**: The next state to transition to after a match.
- **set**: Key-value pairs to assign additional fields or modify the entry.
- **reject**: If `true`, the entry will be rejected when this rule is matched.

### Key Elements of a Ruleset (Inline mode)
Inline mode allows defining the ruleset directly within the configuration using the **sm** property. Each rule specifies the following elements:

- **src**: The current state of the parser. This is where the rule starts.
- **dst**: The next state to transition to after a match. If not specified, the parser remains in the current state.
- **re**: A regular expression to match text in the input. Named capturing groups in the regex are used to extract values.
- **reject**: (Optional) If `true`, the entry will be rejected when this rule is matched. Defaults to `false`.

#### Example
```json
"sm": [
	{"src": "start", "dst": "data", "re": "(?<timestamp>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+\\d{2}:\\d{2}) (?<res>[\\S]+)"},
	{"src": "data", "dst": "message", "re": "- - -\\s+(?<pid>\\d+) (\\S+): From (?<srcip>[^:]+):(?<srcport>\\d+)\\((?<shn>([^\\)]+))\\) to (?<dstip>[^:]+):(?<dstport>\\d+)\\((?<dhn>[^\\)]+)\\),\\s+"},
	{"src": "message", "re": "(?<message>.*$)"}
]
```

In this example:
- The first rule matches the timestamp and resource in the input and transitions from the `start` state to the `data` state.
- The second rule extracts additional fields like `pid`, `srcip`, `srcport`, etc., and transitions to the `message` state.
- The final rule captures the remaining message content.

---

## Examples

### Example 1: Parsing syslog messages
#### Configuration
```json
"processors": {
	"parselog": {
		"type": "parser",
		"config": {
			"path": "./rules/syslogparser.json",
			"map": true,
			"input": "${originalMessage}",
			"output": "parsedData"
		}
	}
}
```

#### Input
```json
[
	{
		"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app 1234 - - User user@domain login=success"
	},
	{
		"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app 1234 - - Error 500: internal server error"
	}
]
```

#### Ruleset (`syslogparser.json`)
```json
{
	"start": [
		{
			"description": "Parse syslog header",
			"regex": "<(\\d+)>\\d (\\S+) (\\S+) (\\S+) (\\d+) ",
			"name": ["priority", "timestamp", "hostname", "appname", "pid"],
			"next": "data"
		}
	],
	"data": [
		{
			"description": "Parse data up to the message",
			"regex": "- - ",
			"name": [],
			"next": "message"
		}
	],
	"message": [
		{
			"description": "Parse login messages",
			"regex": "User ([^ ]+) login=([^ ]+)",
			"name": ["user","result"],
			"next": "end",
			"set": [
				{ "key": "dun", "value" : "${user}"},
				{ "key": "severity", "value": "${result=='success'? 1 : 5}"},
				{ "key": "status", "value": "processed" }
			]
		},
		{
			"description": "Parse error messages",
			"regex": "Error (\\d+): (.*)",
			"name": ["code","description"],
			"next": "end",
			"set": [
				{ "key": "http", "value" : "${code}"},
				{ "key": "body", "value" : "Error: CODE=${code}, DESCRIPTION=${description}"},
				{ "key": "severity", "value": "4"},
				{ "key": "status", "value": "processed" }
			]
		}
	],
	"end": [
		{
			"description": "End state",
			"regex": ".*$"
		}
	]
}
```

#### Output
```json
[
	{
		"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app 1234 - - User user@domain login=success",
		"parsedData": {
			"priority": "34",
			"timestamp": "2023-03-15T10:00:00Z",
			"hostname": "host1",
			"appname": "app",
			"pid": "1234",
			"dun" : "user@domain",
			"severity" : 1,
			"status": "processed"
		}
	},
	
	{
		"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app 1234 - - Error 500: internal server error",
		"parsedData": {
			"priority": "34",
			"timestamp": "2023-03-15T10:00:00Z",
			"hostname": "host1",
			"appname": "app",
			"pid": "1234",
			"http" : 500,
			"body" : "Error: CODE=500, DESCRIPTION=Internal server error",
			"severity" : 4,
			"status": "processed"
		}
	}
]

```

### Example 2: Parsing threat log messages
#### Configuration
```json
"processors": {
	"parse": {
		"type": "parser",
		"config": {
			"sm": [
				{"src": "start", "dst": "data", "re": "(?<timestamp>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+\\d{2}:\\d{2}) (?<res>[\\S]+)"},
				{"src": "data", "dst": "message", "re": "- - -\\s+(?<pid>\\d+) (\\S+): From (?<srcip>[^:]+):(?<srcport>\\d+)\\((?<shn>([^\\)]+))\\) to (?<dstip>[^:]+):(?<dstport>\\d+)\\((?<dhn>[^\\)]+)\\),\\s+"},
				{"src": "message", "re": "(?<message>.*$)"}
			],
			"input": "${originalMessage}",
			"output": "event"
		}
	}
}
```

#### Input
```json
[
	{
		"originalMessage": "<188>0 2019-11-13T01:03:54+01:00 172.26.200.6 2812027172003338(root) - - -  46809403 Threat@FLOW: From 45.227.254.30:59674(aggregate1.21) to 79.170.8.238:135(-), threat name: Blacklist-IP, threat type: Attack, threat subtype: Risk IP, App/Protocol: IPv4/TCP, action: DROP, defender: PTF, severity: Low, detected low reputation ip: 45.227.254.30, category: Scanner, reputation score 100, hit-count: 1(in the last 5 seconds)"
	}
]
```

#### Output
```json
[
	{
		"originalMessage": "<188>0 2019-11-13T01:03:54+01:00 172.26.200.6 2812027172003338(root) - - -  46809403 Threat@FLOW: From 45.227.254.30:59674(aggregate1.21) to 79.170.8.238:135(-), threat name: Blacklist-IP, threat type: Attack, threat subtype: Risk IP, App/Protocol: IPv4/TCP, action: DROP, defender: PTF, severity: Low, detected low reputation ip: 45.227.254.30, category: Scanner, reputation score 100, hit-count: 1(in the last 5 seconds)",
		"event": {
			"timestamp": "2019-11-13T01:03:54+01:00",
			"res": "172.26.200.6",
			"pid": "2812027172003338",
			"srcip": "45.227.254.30",
			"srcport": "59674",
			"shn": "aggregate1.21",
			"dstip": "79.170.8.238",
			"dstport": "135",
			"dhn": "-",
			"message": "46809403 Threat@FLOW: From 45.227.254.30:59674(aggregate1.21) to 79.170.8.238:135(-), threat name: Blacklist-IP, threat type: Attack, threat subtype: Risk IP, App/Protocol: IPv4/TCP, action: DROP, defender: PTF, severity: Low, detected low reputation ip: 45.227.254.30, category: Scanner, reputation score 100, hit-count: 1(in the last 5 seconds)"
		}
	}
]
```

---

## Configuration Parameters
* **path**: Path to the parser file. This property is used to load a ruleset from an external JSON file. It cannot be used together with the **sm** property.
* **sm**: Inline state machine ruleset. This property allows defining the ruleset directly within the configuration as an array of state transitions. When this property is used, the **path** property must not be specified.
* **cores**: Number of parallel instances to run (if supported by Node.js).
* **map**: If `true`, parsed data will be stored as a map object. Otherwise, it will be an array.
* **singleval**: If `true`, only the first value of each name will be taken when multiple values exist.
* **input**: Input expression to be parsed.
* **output**: Output field to store the parsed data.
* **trim**: If `true`, trims the input message before parsing (default: `true`).
* **extend**: If `true`, extends the input object with the generated properties. Otherwise, replaces it with a new object containing only the generated properties (default: `false`).
* **deep**: If `true` and **extend** is enabled, merges generated properties into existing fields. Otherwise, replaces the destination field (default: `false`).

---

## Notes
- Rules are evaluated in order, and the first matching rule is applied.
- Use the `set` property to assign additional fields or modify the entry dynamically.
- Ensure the ruleset JSON file is valid and follows the required syntax.
- The **sm** property is useful for defining inline rulesets directly in the configuration, while the **path** property is used for external ruleset files. These two properties are mutually exclusive and cannot be used together.
