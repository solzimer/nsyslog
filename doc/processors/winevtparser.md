## Windows Event Log Parser Processor

The Windows Event Log Parser Processor parses Windows Event Log XML messages into structured JSON objects. It remaps fields for easier processing.

## Examples

### Example 1: Parse a Windows Event Log message
#### Configuration
```json
"processors": {
	"winevtParser": {
		"type": "winevtparser",
		"config": {
			"input": "${originalMessage}",
			"output": "eventData"
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "<Event><System><TimeCreated SystemTime=\"2023-03-15T10:00:00Z\"/><EventID Qualifiers=\"0\">4624</EventID></System><EventData><Data Name=\"TargetUserName\">JohnDoe</Data><Data Name=\"TargetDomainName\">DOMAIN</Data></EventData></Event>"
}
```

#### Output
```json
{
	"originalMessage": "<Event><System><TimeCreated SystemTime=\"2023-03-15T10:00:00Z\"/><EventID Qualifiers=\"0\">4624</EventID></System><EventData><Data Name=\"TargetUserName\">JohnDoe</Data><Data Name=\"TargetDomainName\">DOMAIN</Data></EventData></Event>",
	"eventData": {
		"Event": {
			"System": {
				"TimeCreated": {
					"SystemTime": "2023-03-15T10:00:00Z"
				},
				"EventID": 4624,
				"Qualifiers": "0"
			},
			"EventData": {
				"Data": {
					"TargetUserName": "JohnDoe",
					"TargetDomainName": "DOMAIN"
				}
			}
		}
	}
}
```

---

## Configuration Parameters
* **input**: Expression to extract the XML message (default: `${originalMessage}`).
* **output**: Field to store the parsed JSON object.
