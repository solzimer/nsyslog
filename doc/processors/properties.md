## Properties Processor

Sets new properties to the input object. The object can be extended with these new properties, or it can be replaced by them.

## Examples

### Example 1: Replace the input object
#### Configuration
```json
"processors": {
	"totuple": {
		"type": "properties",
		"config": {
			"extend": false,
			"set": {
				"tuple": ["${originalMessage}", "${timestamp}"],
				"length": "${originalMessage.length}",
				"extra": {
					"type": "syslog",
					"format": "BSD"
				}
			}
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "This is a test message",
	"timestamp": "2023-03-15T10:00:00Z"
}
```

#### Output
```json
{
	"tuple": ["This is a test message", "2023-03-15T10:00:00Z"],
	"length": 21,
	"extra": {
		"type": "syslog",
		"format": "BSD"
	}
}
```

---

### Example 2: Extend the input object with deep merge
#### Configuration
```json
"processors": {
	"fromtuple": {
		"type": "properties",
		"config": {
			"deep": true,
			"extend": true,
			"set": {
				"count": "${tuple[0]}",
				"tokens": "${tuple[1]}"
			}
		}
	}
}
```

#### Input
```json
{
	"tuple": [5, ["token1", "token2"]],
	"metadata": {
		"source": "logfile"
	}
}
```

#### Output
```json
{
	"tuple": [5, ["token1", "token2"]],
	"metadata": {
		"source": "logfile"
	},
	"count": 5,
	"tokens": ["token1", "token2"]
}
```

---

## Configuration Parameters
* **set**: Object containing the new properties to set. These properties can be expressions evaluated dynamically.
* **extend**: (Default: `true`) When enabled, the input object will be extended with the generated properties. If disabled, the input object will be replaced with a new object containing only the generated properties.
* **deep**: (Default: `false`) When enabled and **extend** is `true`, the generated properties will be deeply merged into the input object if their destination already exists. Otherwise, the destination field will be replaced.
* **delete**: (Optional) List of fields to delete from the input object.
