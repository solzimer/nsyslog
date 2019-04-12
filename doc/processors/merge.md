## Merge

Merge several objects into one

## Examples
Merge tow object fields into other one, and delete the previous ones
```json
"processors" : {
	"merge" : {
		"type" : "merge",
		"config" : {
			"fields" : ["${map}","${extra}"],
			"output" : "entry",
			"delete" : ["map","extra"]
		}
	}
}
```

## Configuration parameters
* **fields** : Array of input expressions
* **output** : Output field
* **delete** : List of fields to be deleted from the entry
