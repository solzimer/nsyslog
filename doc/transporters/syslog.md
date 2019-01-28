## Syslog Transporter

Sends data via syslog protocol.

## Examples

Sends the message through standard udp syslog.

```json
"transporters" : {
	"syslog" : {
		"type" : "syslog",
		"config" : {
			"url" : "udp://localhost:514",
			"format" : "${originalMessage}",
			"application" : "${filename}",
			"hostname" : "localhost",
			"level" : "info",
			"facility" : 5
		}
	}
}
```

Sends through tcp syslog, one message per connection.

```json
"transporters" : {
	"syslog" : {
		"type" : "syslog",
		"config" : {
			"url" : "tcp://localhost:514",
			"format" : "${originalMessage}",
			"application" : "${filename}",
			"hostname" : "localhost",
			"level" : "info",
			"facility" : 5,
			"stream" : false
		}
	}
}
```

Sends through secure tls syslog, on stream mode (multiple messages on the same connection)


```json
"transporters" : {
	"syslog" : {
		"type" : "syslog",
		"config" : {
			"url" : "tls://localhost:514",
			"format" : "${originalMessage}",
			"application" : "${filename}",
			"hostname" : "localhost",
			"level" : "info",
			"facility" : 5,
			"stream" : true,
			"tls" : {
				"key" : "./config/server.key",
				"cert" : "./config/server.crt"
			}			
		}
	}
}
```

## Configuration parameters
* **url** : Connection URL (proto://host:port), where *proto* can be
	* udp : UDP Protocol
	* tcp : TCP protocol
	* tls : TCP through TLS/SSL secure protocol
* **format** : Output expression of the message being sent
* **application** : Syslog header application tag (supports expression)
* **hostname** : Syslog header hostname tag (supports expression)
* **level** : *Level* part of the *priority* tag of the syslog header. Supports either name or number, as decribed in [this table](https://en.wikipedia.org/wiki/Syslog#Severity_level) (supports expression)
* **facility** : *Facility* part of the *priority* tag of the syslog header. Supports either name or number, as decribed in [this table](https://en.wikipedia.org/wiki/Syslog#Facility) (supports expression)
* **stream** : When protocol is *tcp* or *tls*, messages can be sent, either one per connection, or in stream mode, where the same connection is used to send multiple messages to avoid the overhead of the *connect-send-close* flow on every message. Activate only if your syslog server supports stream mode.
* **tls** : TLS options as described in [NodeJS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options)
