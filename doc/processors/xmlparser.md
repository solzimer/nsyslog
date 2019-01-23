## XML Parser Processor

Parses XML data

## Examples
XML parsing with multithreading enabled (if supported by nodejs)
```json
"processors" : {
	"parser" : {
		"type" : "xmlparser",
		"config" : {
			"input" : "${originalMessage}",
			"output" : "xmldata",
			"cores" : 4
		}
	}
}
```

XML multiline parsing with multithreading enabled (if supported by nodejs). XML data is within '<link>' tags
```json
"processors" : {
	"parser" : {
		"type" : "xmlparser",
		"config" : {
			"input" : "${originalMessage}",
			"output" : "xmldata",
			"multiline" : true,
			"tag" : "link",
			"cores" : 4
		}
	}
}
```

## Configuration parameters
* **input** : Expression to be parsed
* **cores** : Number of threads if multithreading is supported by nodejs
* **output** : Output field
* **multiline** : XML data is contained in more than one entry. If enabled, **tag** is mandatory.
* **tag** : XML tags that delimite XML data to be parsed.
