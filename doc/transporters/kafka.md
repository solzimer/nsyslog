## Kafka Transporter

Sends data through Apache Kafka message broker

## Examples

Sends to a kafka cluster with roundrobin on its topic partitions

```json
"transporters" : {
	"kafka" : {
		"type" : "kafka",
		"config" : {
			"url" : ["kafka://host1:9092","kafka://host2:9092"],
			"format" : "${originalMessage}",
			"topic" : "nsyslog_topic",
			"mode" : "roundrobin"
		}
	}
}
```

Sends to a kafka cluster (secure protocol), using a hashed field to distribute load on each partition.

```json
"transporters" : {
	"kafka" : {
		"type" : "kafka",
		"config" : {
			"url" : ["kafkas://host1:9092","kafkas://host2:9092"],
			"format" : "${originalMessage}",
			"topic" : "nsyslog_topic",
			"mode" : "hashed",
			"field" : "${severity}",
			"tls" : {
				"rejectUnauthorized" : false
			}
		}
	}
}
```

## Configuration parameters
* **url** : Kafka Endpoint (proto://host:port/path), where *proto* can be either kafka or kafkas.
* **format** : Output expression of the message being sent
* **topic** : Kafka topic (allows expression)
* **mode** : Topic partition balance mode:
	* roundrobin : Simple roundrobin mechanism
	* hashed : Partition is assigned using a numeric hash from an entry field
	* fixed : Partition is assigned using a numeric field 	
* **field** : Field expression to be used in *hashed* or *fixed* mode.
* **tls** : TLS options as described in [NodeJS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options)
