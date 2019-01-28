## File Transporter

Sends data to a file.

## Examples

```json
"transporters" : {
	"file" : {
		"type" : "file",
		"config" : {
			"path" : "/var/logout${path}",
			"format" : "${originalMessage}"
		}
	}
}
```

## Configuration parameters
* **path** : File path (supports expression)
* **format** : Output expression of the message being sent
