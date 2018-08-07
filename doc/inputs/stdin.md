## Standard Input

Reads raw or json data from the process standard input.

## Examples

Standard input with raw format
```json
"inputs" : {
	"stdin" : {
		"type" : "stdin",
		"config" : {
			"format" : "raw"
		}
	}
}
```

## Configuration parameters
* **format** : can be *raw* or *json*. When *json* is used, each line will be interpreted as a single json object.

## Output
Each read will generate an object with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'json',
	originalMessage : '<raw data or JSON object>'
}
```
