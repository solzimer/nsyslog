## Syslog Input

Syslog input places a server that listens for syslog messages. It supports several transport protocols, but does not parse the received lines. If you want to do syslog parsing, you can use the [syslog parser processor](../processors/syslogparser.md).

## Examples

UDP Syslog server with buffer flow control

```json
"inputs" : {
	"syslog" : {
		"type" : "syslog",
		"maxPending" : 1000,
		"buffer" : true,
		"config" : {
			"url" : "udp://0.0.0.0:514",
		}
	}
}
```

TCP Syslog server without buffer flow control

```json
"inputs" : {
	"syslog" : {
		"type" : "syslog",
		"maxPending" : 1000,
		"buffer" : false,
		"config" : {
			"url" : "tcp://0.0.0.0:514",
		}
	}
}
```

Secure TLS Syslog server with private key and certificate

```json
"inputs" : {
	"syslog" : {
		"type" : "syslog",
		"maxPending" : 1000,
		"config" : {
			"url" : "tls://0.0.0.0:1514",
			"tls" : {
				"key" : "./config/server.key",
				"cert" : "./config/server.crt"
			}
		}
	}
}
```

## Configuration parameters
* **url** : Server URL bind pattern. Takes the form of *&lt;protocol&gt;://&lt;bind host&gt;:&lt;bind port&gt;*. Allowed protocols are: **udp**,**udp6**,**tcp**,**tcp6**,**tls** and **tls6**.
* **tls** : Object passed to the TLS server socket, as described in [NodeJS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options)

## Output
Each syslog message will generate an object with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'syslog',
	timestamp : Date.now(),
	originalMessage : '<syslog message>',
	server : {
		{
			protocol : '<bind protocol>',
			port : '<bind port>',
			host : '<bind host>'
		}
	},
	client : {
		address : '<client address>'
	}
}
```
