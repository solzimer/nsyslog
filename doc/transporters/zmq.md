## ZeroMQ Transporter

Sends data through ZeroMQ

## Examples

Sends to zmq tcp push endpoint

```json
"transporters" : {
	"push" : {
		"type" : "zmq",
		"config" : {
			"url" : "tcp://localhost:3000",
			"format" : "${originalMessage}",
			"mode" : "push"
		}
	}
}
```

## Configuration parameters
* **url** : ZeroMQ entdpoint.
* **format** : Output expression of the message being sent
* **mode** : ZMQ endpoint mode:
	* push : Push messages to the server
	* pub : Publish messages to a server channel
* **channel** : If *pub* mode, channel expression.
