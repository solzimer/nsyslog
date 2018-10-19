```json
"trans" : {
	"type" : "translate",
	"config" : {
		"file" : "./data/http_codes.json",
		"map" : {
			"200" : "OK",
			"304" : "Redirect",
			"500" : "Internal Server Error",
			"*" : "Codigo desconocido"
		},
		"fields" : [
			{"input" : "${http.status}", "output" : "http.statusString"}
		]
	}
}
```
