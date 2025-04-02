## Stat Transporter

Logs the number of messages received after a specified threshold.

## Examples

```json
"transporters" : {
	"stat" : {
		"type" : "stat",
		"config" : {
			"threshold" : 1000
		}
	}
}
```

## Configuration parameters
* **threshold** : The message count threshold for logging. Defaults to 1000.
