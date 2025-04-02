## Redis Transporter

Sends data through a Redis channel.

## Examples

```json
"transporters" : {
	"redis" : {
		"type" : "redis",
		"config" : {
			"url" : ["redis://host1:6379","redis://host2:6379"],
			"format" : "${JSON}",
			"channel" : "nsyslog"
		}
	}
}
```

## Configuration parameters
* **url** : Redis endpoint(s) (e.g., `redis://host:port`).
* **format** : Output expression of the message being sent.
* **channel** : Redis publish channel (supports expressions).
