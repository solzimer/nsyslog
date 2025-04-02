## Regex Processor

Processes log entries using regular expressions to extract fields.

## Examples
```json
"processors": {
	"regex": {
		"type": "regex",
		"config": {
			"regex": "([a-z]{3} [0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}) ([a-z0-9]+) ([a-zA-Z0-9]+)\\[([0-9]+)\\]: \\(([a-zA-Z0-9]+)\\) CMDOUT \\((.*)\\)",
			"fields": ["date", "host", "process", "pid", "user", "message"],
			"input": "${originalMessage}",
			"output": "event"
		}
	}
}
```

### Input
```json
{
	"originalMessage": "mar 12 11:30:02 host1 CROND[1425251]: (host1) CMDOUT (TypeError: Cannot read properties of undefined (reading 'replace'))"
}
```

### Output
```json
{
	"originalMessage": "mar 12 11:30:02 host1 CROND[1425251]: (host1) CMDOUT (TypeError: Cannot read properties of undefined (reading 'replace'))",
	"event": {
		"date": "mar 12 11:30:02",
		"host": "host1",
		"process": "CROND",
		"pid": "1425251",
		"user": "host1",
		"message": "TypeError: Cannot read properties of undefined (reading 'replace')"
	}
}
```

## Configuration parameters
* **regex**: The regular expression to match against the input message.
* **fields**: An array of field names corresponding to regex capture groups.
* **input**: Expression to extract the input message (default: `${originalMessage}`).
* **output**: Output field to store the extracted fields (optional).
