## ZeroMQ Input

Creates a ZeroMQ client and reads raw or json data from publisher.

## Examples

ZMQ in *sub* mode, subscribed to *my channel*
```json
"inputs" : {
	"zmq" : {
		"type" : "zmq",
		"config" : {
			"url" : "tcp://127.0.0.1:9999",
			"mode" : "sub",
			"channel" : "my channel",
			"format" : "json"
		}
	}
}
```

## Configuration parameters
* **url** : Connection URL.
* **mode** : Can be either *pull* or *sub*
* **channel** : Only if **sub** mode is used.
* **format** : can be *raw* or *json*. If *json* format is used, each received message is interpreted as a single JSON object.

## Output
Each read will generate an object with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'zmq',
	mode : '<sub or pull>',
	url : '<Connection URL>'
	originalMessage : '<raw data or JSON object>'
}
```
