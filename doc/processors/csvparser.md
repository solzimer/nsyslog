## CSV Parser

Parses a expression into a CSV field array.

## Examples
CSV Parser with 3 cores (if multithread is supported)
```json
"processors" : {
	"csv" : {
		"type" : "csvout",
		"config" : {
			"output" : "csvdata",
			"input" : "${csvline}",
			"cores" : 3,
			"options" : {
				"delimiter" : ","
			}
		}
	}
}
```

## Configuration parameters
* **output** : Output field to store the CSV array
* **input** : Expression to be parsed
* **cores** : Number of threads if multithreading is supported by nodejs
* **options** : Options object to pass to the [CSV parser](https://csv.js.org/parse/options/)
