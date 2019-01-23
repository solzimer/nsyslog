## Timestamp Processor

Places a timestamp to the input object, or parses an existing expression into a Date object.

## Examples

```json
"processors" : {
	"timestamp" : {
		"type" : "timestamp",
		"config" : {
			"input" : "${tsstring}",
			"format" : "HH:mm:ss YYYY-MM-DD",
			"output" : "timestamp"
		}
	}
}
```

## Configuration parameters
* **input** : Optional. If specified, expression where fetch a timestamp string to be parsed. If not specified, the processor will use the actual timestamp.
* **format** : If input is specified. Format expression of the input to be parsed, following [MomentJS expression](https://momentjs.com/docs/#/displaying/format/)
* **output** : Field where timestamp is stored
* **unix** : If true, timestamp will be stored as a long number instead of a javascript Date object.
