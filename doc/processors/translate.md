## Syslog Parser Processor

Translate field values using a lookup table.

## Examples
Translates some HTTP status codes, using either a json file, or an inline map
```json
"trans" : {
	"type" : "translate",
	"config" : {
		"file" : "./data/http_codes.json",
		"map" : {
			"200" : "OK",
			"304" : "Redirect",
			"500" : "Internal Server Error",
			"*"   : "Codigo desconocido"
		},
		"fields" : [
			{"input" : "${http.status}", "output" : "http.statusString"}
		]
	}
}
```

## Configuration parameters
* **file** : JSON file with key/value pairs to be translated
* **map** : Inline map of key/value pairs to be translated
* **fields** : Array of fields to be translated
