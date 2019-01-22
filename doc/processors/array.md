## Array

Inserts entries into an array of fixed size, and outputs them at size or time intervals.

## Examples
Size based array group. Outputs an entry with an 'array' field that contains
all the elements.
```json
"processors" : {
	"arrays" : {
		"type" : "array",
		"config" : {
			"max" : 10,
			"field" : "list"
		}
	}
}
```

Time and size based array group. Outputs an entry with an 'array' field that contains
all the elements, when size of array reaches 10 entries, or on a 2 sec interval basis.
```json
"processors" : {
	"arrays" : {
		"type" : "array",
		"config" : {
			"max" : 10,
			"timeout" : 2000,
			"field" : "list"
		}
	}
}
```

## Configuration parameters
* **max** : Maximum number of elements in the array.
* **timeout** : If specified, number of millisecons of the output interval.
* **field** : Output field.
