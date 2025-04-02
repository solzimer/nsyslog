## XML Parser Processor

The XML Parser Processor parses XML messages into structured JSON objects. It supports single-threaded and multi-threaded processing, as well as multiline XML parsing.

## Examples

### Example 1: Parse XML with multithreading
#### Configuration
```json
"processors": {
	"xmlParser": {
		"type": "xmlparser",
		"config": {
			"input": "${originalMessage}",
			"output": "xmlData",
			"cores": 4
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "<root><item>Value1</item><item>Value2</item></root>"
}
```

#### Output
```json
{
	"originalMessage": "<root><item>Value1</item><item>Value2</item></root>",
	"xmlData": {
		"root": {
			"item": ["Value1", "Value2"]
		}
	}
}
```

---

### Example 2: Parse multiline XML
#### Configuration
```json
"processors": {
	"xmlParser": {
		"type": "xmlparser",
		"config": {
			"input": "${originalMessage}",
			"output": "xmlData",
			"multiline": true,
			"tag": "record"
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "<record><field>Value1</field></record><record><field>Value2</field></record>"
}
```

#### Output
```json
{
	"originalMessage": "<record><field>Value1</field></record><record><field>Value2</field></record>",
	"xmlData": [
		{
			"record": {
				"field": "Value1"
			}
		},
		{
			"record": {
				"field": "Value2"
			}
		}
	]
}
```

---

## Configuration Parameters
* **input**: Expression to extract the XML message (default: `${originalMessage}`).
* **output**: Field to store the parsed JSON object.
* **cores**: Number of threads to use for multithreading (default: `0`, meaning single-threaded).
* **multiline**: Whether the XML data spans multiple entries. If enabled, **tag** is mandatory.
* **tag**: XML tag that delimits the XML data to be parsed.
