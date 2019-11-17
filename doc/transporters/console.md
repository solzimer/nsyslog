## Console Transporter

Sends data to the standard output. Supports level coloring.

## Examples

Sends the message as debug logs

```json
"transporters" : {
	"log" : {
		"type" : "console",
		"config" : {
			"format" : "${timestamp} => ${originalMessage}",
			"level" : "log"
		}
	}
}
```

## Configuration parameters
* **format** : Output expression of the message being sent
* **json** : JSON output options
	* format : true / false
	* spaces : json indentation
	* color : true / false. Colorize json (if true, *level* is ignored)
* **level** : Output level (supports expression). Can be one of:
	* info : Informational level
	* debug : Debug lebel
	* log : Log level
	* warn : Warning level
	* error : Error level
