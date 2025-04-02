## Joiner Processor

Joins multiple log entries into a single string.

## Examples
```json
"processors": {
	"joiner": {
		"type": "joiner",
		"config": {
			"input": "${originalMessage}",
			"output": "joinedMessage",
			"delimiter": "\n",
			"max": 1000,
			"wait": 2000
		}
	}
}
```

## Configuration parameters
* **input**: Expression to extract the input field (default: `${originalMessage}`).
* **output**: Output field to store the joined string.
* **delimiter**: String used to separate joined entries (default: `\n`).
* **max**: Maximum number of entries to join (default: 1000).
* **wait**: Maximum wait time in milliseconds before outputting the joined string (default: 2000 ms).
