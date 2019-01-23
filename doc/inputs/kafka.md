## Kafka Input

Kafka Input allows the reading of several kafka topics simultaneously, as well as topic monitoring for detection of new topics that matches the selected patterns.

## Examples

Kafka subscription to 'logline__.\*' pattern. Will watch for new topics that match the pattern.
```json
"inputs" : {
	"kafka" : {
		"type" : "kafka",
		"config" : {
			"url" : ["kafka://server1:9092","kafka://server2:9092"],
			"topics" : ["/logline__.*/"],
			"format" : "json",
			"offset" : "earliest",
			"group" : "nsyslog",
			"watch" : true
		}
	}
}
```

## Configuration parameters
* **url** : String or array of strings. List of Kafka hosts to connect to (kafka://host:port or kafkas://host:port for TLS connection).
* **topics** : String or array. List of kafka topics to subscribe to. If a topic is embraced between '/' characters, it will
be interpreted as a regular expression to be matched against.
* **format** : Can be either of **raw** or **json**. When **raw** is used, the raw content of the message will be put in the 'originalMessage' field of the entry. Otherwise, if **json** is used, the content will be parsed as a JSON object and placed into de 'originalMessage' field.
* **offset** : Can be one of **earliest** or **latest**. Initial offset when start reading a new topic.
* **group** : Consumer group ID (to keep track of the topics offsets)
* **watch** : If **true**, the Kafka input will search periodically for new topics that matches the patterns, and start reading from them.
* **tls** : TLS/SSL options as described in [NodeJS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options)

## Output
Each read will generate an object with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'kafka',
	topic : '<topic.name>',
	originalMessage : '<String value or JSON object>'
}
```
