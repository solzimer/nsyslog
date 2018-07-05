## Properties

Sets new properties to the input object. Object can be extended with these new properties, or it can be replaced by them.

## Examples

```json
"processors" : {
	"totuple" : {
		"type" : "properties",
		"config" : {
			"extend" : false,
			"set" : {
				"tuple" : ["${originalMessage}", "${timestamp}"],
				"length" : "${originalMessage.length}",
				"extra" : {
					"type" : "syslog",
					"format" : "BSD"
				}
			}
		}
	}
}
```

```json
"processors" : {
	"fromtuple" : {
		"type" : "properties",
		"config" : {
			"deep" : true,
			"extend" : true,
			"set" : {
				"count" : "${tuple[0]}",
				"tokens" : "${tuple[1]}"
			}
		}
	}
}
```
## Configuration parameters
* **extend** : By default *true*. When set, input object will be extended by the generated properties. Otherwise, it will be replaced with a new object containing only the generated properties.
* **deep** : By default *false*. When set, and **extend** enabled, generated properties will be merged if their destination already exists. Otherwise, the destination field will be replaced with the newly generated properties.
* **set** : Object containing the new properties.
