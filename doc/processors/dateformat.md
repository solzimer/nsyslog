## Date / Time Formatter

Formats a date. Date must be a javascript Date object or an ISO timestamp (YYYY-MM-DDTHH:mm:ss)

## Examples

```json
"processors" : {
	"format" : {
		"type" : "dateformat",
		"config" : {
			"input" : "${timestamp}",
			"format" : "DD/MM/YYYY",
			"output" : "date"
		}
	}
}
```

Multiple assignations
```json
"processors" : {
	"format" : {
		"type" : "dateformat",
		"config" : {
			"input" : "${timestamp}",
			"fields" : [
				{"format" : "DD/MM/YYYY", "output" : "date"},
				{"format" : "HH:mm:ss", "output" : "time"}
			]
		}
	}
}
```

## Configuration parameters
* **field** / **input** : Expression for timestamp field
* **format** : Output format following [MomentJS format](https://momentjs.com/docs/#/displaying/format/)
* **output** : Output field
* **fields** : Array of <*format*,*output*> values form multiple assignations
