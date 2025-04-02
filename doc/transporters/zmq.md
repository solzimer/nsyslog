## ZeroMQ Transporter

Sends data through ZeroMQ.

## Examples

Sends to a ZeroMQ TCP push endpoint:

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

Publishes messages to a ZeroMQ channel:

```json
"transporters" : {
	"pub" : {
		"type" : "zmq",
		"config" : {
			"url" : "tcp://localhost:3000",
			"format" : "${originalMessage}",
			"mode" : "pub",
			"channel" : "my_channel"
		}
	}
}
```

## Configuration parameters
* **url** : ZeroMQ endpoint (e.g., `tcp://host:port`).
* **format** : Output expression of the message being sent.
* **mode** : ZMQ endpoint mode:
	* **push** : Push messages to the server.
	* **pub** : Publish messages to a server channel.
* **channel** : If *pub* mode, channel expression to specify the target channel.
