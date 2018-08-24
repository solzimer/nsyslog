```javascript
{
	// General parameters
	"config" : {
		"datadir" : "/tmp/nsyslog",		// Path to store buffers
		"input" : {"buffer" : 1000},
		"process" : {"buffer": 1000}
	},

	// Input declarations
	"inputs" : {
		// This is the ID / Reference of the input
		"file" : {
			"type" : "file",	// Input type

			// Configuration for this input instance
			"config" : {
				"path" : "/var/log/**/*.log",
				"watch" : true,
				"readmode" : "offset",
				"offset" : "start"
			}
		},
		"syslog" : {
			"type" : "syslog",
			"config" : {
				"url" : "tcp://localhost:1514",
				"tls" : {
					"key" : "./config/server.key",
					"cert" : "./config/server.crt"
				}
			}
		}
	},

	// Processor declarations
	"processors" : {
		"timestamp" : {
			"type" : "timestamp",
			"config" : {}
		}
	},

	// Transporter declarations
	"transporters" : {
		"syslog" : {
			"type" : "syslog",
			"config" : {
				"url" : "udp://localhost:514",
				"format" : "${originalMessage}",
				"application" : "${filename}",
				"hostname" : "localhost",
				"level" : "info",
				"facility" : 5,
				"stream" : true,
				"tls" : {
					"key" : "./config/server.key",
					"cert" : "./config/server.crt"
				}
			}
		},
		"null" : {
			"type" : "null"
		}
	},

	// Flow declarations
	"flows" : [
		{"from":"${input}=='file'", "processors":["timestamp"], "transporters":["syslog"], "mode":"parallel"}
	]
}

```
