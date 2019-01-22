## Syslog Parser Processor

Parses a syslog line using the [nsyslog-parser](https://github.com/solzimer/nsyslog-parser) module.

## Examples
Syslog parsing with multithreading enabled (if supported by nodejs)
```json
"processors" : {
	"parser" : {
		"type" : "syslogparser",
		"config" : {
			"field" : "${originalMessage}",
			"cores" : 4
		}
	}
}
```

## Configuration parameters
* **field** : Expression to be parsed
* **cores** : Number of threads if multithreading is supported by nodejs
