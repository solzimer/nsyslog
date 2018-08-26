# Introduction

NSyslog is configured through a JSON config file. The skeleton of this file is as follows:

```javascript
{
	// Optional. You can include whatever JSON file that will be merged
	// with the main file
	"include" : [
		// List of JSON files
	],

	// Optional. Overrides global configurations
	"config" : {},

	// Filter definitions.
	"filters" : {},

	// Filter groups (optional)
	"filterGroups" : {},

	// Input declarations
	"inputs" : {},

	// Processor declarations
	"processors" : {},

	// Processor groups (Optional)
	"processorGroups" : {},

	// Transporter declarations
	"transporters" : {},

	// Transporter groups (optional)
	"transporterGroups" : {}

	// Flows
	"flows" : [
		// List of flow objects
	]
}
```

## Include
Every JSON config file can have an *include* section. This is a list of filepaths that will be read
and merged into the main file. An included file can have also another *include* section.

Example:
*config.json*
```JSON
{
	"include" : [
		"./inputs.json"
	],
	"inputs" : {
		"input1" : {
			"type" : "redis"
		}
	}
}
```
*inputs.json*
```JSON
{
	"inputs" : {
		"input2" : {
			"type" : "syslog"
		}
	}
}
```

Final configuration:
```JSON
{
	"inputs" : {
		"input1" : {
			"type" : "redis"
		},
		"input2" : {
			"type" : "syslog"
		}
	}
}
```

Basic Configuration example:
```JSON
{
	"config" : {
		"datadir" : "/tmp/nsyslog",
		"input" : {"maxPending" : 1000},
		"buffer" : {"maxPending": 1000},
		"processor" : {"maxPending": 1000},
		"transporter" : {"maxPending": 1000}
	},

	"inputs" : {
		"zmq" : {
			"type" : "zmq",
			"config" : {
				"url" : "tcp://127.0.0.1:9999",
				"mode" : "sub",
				"channel" : "nsyslog_channel",
				"format" : "json"
			}
		}
	},

	"transporters" : {
		"console" : {
			"type" : "console",
			"config" : {
				"format" : "${JSON}"
			}
		},
		"null" : {
			"type" : "null"
		}
	},

	"flows" : [
		{"from":"*", "transporters":["console"]}
	]
}
```

You can see a list of examples in [this link](../../config)

[Back](../README.md)
