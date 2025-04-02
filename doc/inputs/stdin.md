## Standard Input

The Standard Input (stdin) allows reading data from the process's standard input stream. It supports both raw text and JSON-formatted input, making it useful for testing or scenarios where data is piped into the application.

## Examples

### Standard input with raw format
```json
"inputs": {
	"stdin": {
		"type": "stdin",
		"config": {
			"format": "raw"
		}
	}
}
```

### Standard input with JSON format
```json
"inputs": {
	"stdin": {
		"type": "stdin",
		"config": {
			"format": "json"
		}
	}
}
```

## Configuration Parameters

- **format**:  
  Specifies the format of the input data.  
  - **raw**: Each line is treated as a raw string.  
  - **json**: Each line is parsed as a JSON object. If parsing fails, the line is treated as raw text.  
  Defaults to **raw**.

## Output

Each line read from stdin generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'stdin',
	originalMessage: '<raw data or JSON object>'
}
```

### Notes:
- The `originalMessage` field contains the raw line or the parsed JSON object, depending on the `format` configuration.
- If the `format` is set to **json** and a line cannot be parsed as JSON, it will be returned as raw text.
- This input is particularly useful for testing or for processing data piped from other commands or scripts.
