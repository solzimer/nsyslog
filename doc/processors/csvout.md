## CSV Out

Outputs entry fields as a flat csv string

## Examples
CSV line with 'comma' delimiter
```json
"processors" : {
	"csv" : {
		"type" : "csvout",
		"config" : {
			"output" : "csvline",
			"fields" : ["${originalMessage}","${type}","${input}","${timestamp}"],
			"options" : {
				"delimiter" : ","
			}
		}
	}
}
```

## Configuration parameters
* **output** : Output field to store the CSV line
* **fields** : Array of expressions to fetch the CSV fields
* **options** : Options object to pass to the [CSV processor](https://csv.js.org/stringify/options/)
