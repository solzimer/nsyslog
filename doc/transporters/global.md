## Global Transporter

The Global Transporter stores log messages in a global shared memory. It allows for centralized access to log data across different parts of the application.

## Examples

```json
"transporters" : {
	"global" : {
		"type" : "global",
		"config" : {
			"input" : "${originalMessage}",
			"output" : "nsyslog"
		}
	}
}
```

## Configuration parameters
* **input** : Input expression for the log message. Defaults to `${originalMessage}`.
* **output** : The key in the global shared memory where the message will be stored. Defaults to `nsyslog`.
