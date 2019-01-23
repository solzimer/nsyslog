## Date / Time Formatter

Formats a date. Date must be a javascript Date object or an ISO timestamp (YYYY-MM-DDTHH:mm:ss)

## Examples

```json
"processors" : {
	"format" : {
		"type" : "dateformat",
		"config" : {
			"field" : "${timestamp}",
			"format" : "DD/MM/YYYY",
			"output" : "date"
		}
	}
}
```

## Configuration parameters
* **field** : Expression for timestamp field
* **format** : Output format following [MomentJS format](https://momentjs.com/docs/#/displaying/format/)
* **output** : Output field
