## Redis Input

Redis Input allows the reading of several Redis pub/sub channels simultaneously. It allows both channels and channel patterns.

## Examples

Redis subscription to several channels.
```json
"inputs" : {
	"redis" : {
		"type" : "redis",
		"config" : {
			"url" : "redis://localhost",
			"channels" : ["test*","input","logs_*"],
			"format" : "raw"
		}
	}
}
```

## Configuration parameters
* **url** : String or array of strings. List of Redis hosts to connect to. If cluster is supported in Redis, it will use cluster mode and hosts autodiscover. Otherwise, the first url will be used for connection.
* **channels** : String or array. List of Redis channels to subscribe to. Accepts redis channel patterns.
be interpreted as a regular expression to be matched against.
* **format** : Can be either of **raw** or **json**. When **raw** is used, the raw content of the message will be put in the 'originalMessage' field of the entry. Otherwise, if **json** is used, the content will be parsed as a JSON object and placed into de 'originalMessage' field.

## Output
Each read will generate an object with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'redis',
	channel : '<channel.name>',
	originalMessage : '<String value or JSON object>'
}
```
