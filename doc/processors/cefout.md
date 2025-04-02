## CEF Out

Converts log entries into Common Event Format (CEF) strings.

## Examples

Basic CEF output configuration:
```json
"processors": {
	"cef": {
		"type": "cefout",
		"config": {
			"input": "${originalMessage}",
			"output": "cefMessage",
			"headers": {
				"DeviceVendor": "MyVendor",
				"DeviceProduct": "MyProduct",
				"DeviceVersion": "1.0",
				"SignatureID": "12345",
				"Name": "MyEvent",
				"Severity": "5"
			}
		}
	}
}
```

### Input Example
```json
{
	"originalMessage": {
		"eventId": "1001",
		"source": "Application",
		"message": "An error occurred",
		"timestamp": "2023-10-01T12:00:00Z"
	}
}
```

### Output Example
```json
{
	"cefMessage": "CEF:0|MyVendor|MyProduct|1.0|12345|MyEvent|5|eventId=1001 source=Application message=An error occurred timestamp=2023-10-01T12:00:00Z"
}
```

## Configuration parameters

* **input**: Input field containing the data to convert to CEF format.  
  Default: `${originalMessage}`.

* **output**: Output field to store the resulting CEF string.  
  Default: `cef`.

* **headers**: Optional. Custom headers for the CEF message. If not provided, default headers will be used.  
  Default headers:
  - **CEFVersion**: `0`
  - **DeviceVendor**: `localdomain`
  - **DeviceProduct**: `localdomain`
  - **DeviceVersion**: `0`
  - **SignatureID**: `0`
  - **Name**: `localdomain`
  - **Severity**: `0`
