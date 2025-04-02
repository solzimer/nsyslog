## Static Input

The Static Input provides predefined static data as input. It is useful for testing or scenarios where a fixed set of data needs to be processed.

## Examples

### Static input with looping
```json
"inputs": {
	"static": {
		"type": "static",
		"config": {
			"lines": [
				"<134>Jan 10 10:00:00 host CEF:0|Vendor|Product|Version|Signature|Name|Severity|src=192.168.1.1 dst=192.168.1.2 spt=12345 dpt=80 msg=Test message 1",
				"<134>Jan 10 10:01:00 host CEF:0|Vendor|Product|Version|Signature|Name|Severity|src=192.168.1.3 dst=192.168.1.4 spt=54321 dpt=443 msg=Test message 2",
				"<134>Jan 10 10:02:00 host CEF:0|Vendor|Product|Version|Signature|Name|Severity|src=10.0.0.1 dst=10.0.0.2 spt=22 dpt=22 msg=SSH connection attempt"
			],
			"loop": true,
			"interval": 1000
		}
	}
}
```

### Static input without looping
```json
"inputs": {
	"static": {
		"type": "static",
		"config": {
			"lines": [
				"<134>Jan 10 10:00:00 host CEF:0|Vendor|Product|Version|Signature|Name|Severity|src=192.168.1.1 dst=192.168.1.2 spt=12345 dpt=80 msg=Test message 1",
				"<134>Jan 10 10:01:00 host CEF:0|Vendor|Product|Version|Signature|Name|Severity|src=192.168.1.3 dst=192.168.1.4 spt=54321 dpt=443 msg=Test message 2"
			],
			"loop": false
		}
	}
}
```

## Configuration Parameters

- **lines**:  
  An array of strings representing the static lines to be returned as input. Defaults to an empty array.

- **loop**:  
  A boolean indicating whether to loop through the lines indefinitely.  
  - If `true`, the input will restart from the first line after reaching the end.  
  - If `false`, the input will stop after processing all lines.  
  Defaults to `false`.

- **interval**:  
  The interval in milliseconds between each line being returned.  
  - If set to `0`, lines are returned as quickly as possible.  
  Defaults to `0`.

## Output

Each line generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'static',
	originalMessage: '<line>'
}
```

### Notes:
- The `originalMessage` field contains the static line being returned.
- If `loop` is enabled, the input will continuously cycle through the lines.
- The `interval` parameter can be used to control the rate at which lines are returned.
