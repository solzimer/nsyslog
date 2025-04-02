## Elastic Transporter

Sends data to an ElasticSearch server or cluster.

## Examples

Sends log entries to an ElasticSearch index:

```json
"transporters" : {
	"elastic" : {
		"type" : "elastic",
		"config" : {
			"url" : ["http://host1:9200", "http://host2:9200"],
			"index" : "logs",
			"format" : "${JSON}",
			"headers" : {
				"Content-Type" : "application/json"
			},
			"options" : {
				"maxRetries" : 3,
				"requestTimeout" : 30000
			}
		}
	}
}
```

## Configuration parameters
* **url** : ElasticSearch endpoint(s) (e.g., `http://host:port` or `https://host:port`).
* **index** : The ElasticSearch index to use (supports expressions).
* **format** : Output expression of the message being sent.
* **headers** : HTTP headers for the requests (supports expressions).
* **options** : Additional options for the ElasticSearch client, such as:
	* **maxRetries** : Maximum number of retries for failed requests.
	* **requestTimeout** : Timeout for requests in milliseconds.
	* **sniffOnStart** : Whether to sniff the cluster on startup.
* **tls** : TLS options for secure connections, as described in [NodeJS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
