## Elastic Input

The Elastic Input allows fetching data from an Elasticsearch cluster. It supports querying indices, handling watermarks for incremental data fetching, and batching results.

## Examples

### Fetch data from Elasticsearch with a query
```json
"inputs": {
	"elastic": {
		"type": "elastic",
		"config": {
			"url": ["http://localhost:9200"],
			"index": "logs-*",
			"query": {
				"match": {
					"level": "error"
				}
			},
			"batchsize": 100,
			"interval": 5000,
			"sort": ["@timestamp:asc"],
			"watermark": {
				"@timestamp": "2023-01-01T00:00:00Z"
			},
			"tls": {
				"rejectUnauthorized": false
			}
		}
	}
}
```

## Configuration Parameters

- **url**: Array of Elasticsearch node URLs. Supports both HTTP and HTTPS.
- **index**: Index pattern or name to query. Can be dynamically evaluated using expressions.
- **query**: Elasticsearch query object. Defaults to `{ match: {} }`.
- **batchsize**: Number of documents to fetch per query. Defaults to `100`.
- **interval**: Interval in milliseconds to fetch the next batch of data. If not specified, data is fetched on demand.
- **sort**: Array of fields to sort the query results. Example: `["@timestamp:asc"]`.
- **watermark**: Object specifying the initial watermark for incremental fetching. Example: `{ "@timestamp": "2023-01-01T00:00:00Z" }`.
- **tls**: TLS configuration for HTTPS connections. See [Node.js TLS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) for details.
- **options**: Additional options for the Elasticsearch client, such as authentication. See the [Elasticsearch JavaScript client documentation](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-configuration.html) for a full list of supported options. Examples:
  - `maxRetries`: Maximum number of retries for failed requests. Example: `{ "maxRetries": 3 }`.
  - `requestTimeout`: Timeout in milliseconds for requests. Example: `{ "requestTimeout": 30000 }`.
  - `sniffOnStart`: Enable sniffing on client startup. Example: `{ "sniffOnStart": true }`.

## Output

Each fetch generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'elastic',
	index: '<queried index>',
	originalMessage: '<document source>'
}
```

### Notes:
- The `originalMessage` field contains the `_source` of the fetched document.
- Watermarks are automatically updated based on the last document fetched.
- If the `interval` is set, the input behaves as a push input, fetching data periodically. Otherwise, it behaves as a pull input, fetching data on demand.
