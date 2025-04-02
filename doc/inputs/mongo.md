## MongoDB Input

The MongoDB Input allows fetching data from MongoDB collections. It supports querying multiple collections, handling watermarks for incremental data fetching, and managing concurrent cursors.

## Examples

### Fetch data from a MongoDB collection
```json
"inputs": {
	"mongo": {
		"type": "mongo",
		"config": {
			"url": "mongodb://localhost:27017/test",
			"collection": "logs",
			"query": { "level": "error" },
			"sort": { "timestamp": 1 },
			"maxCursors": 5,
			"watermark": { "timestamp": "2023-01-01T00:00:00Z" }
		}
	}
}
```

### Fetch data from multiple collections with patterns
```json
"inputs": {
	"mongo": {
		"type": "mongo",
		"config": {
			"url": "mongodb://localhost:27017/test",
			"collection": ["/logs.*/", "audit"],
			"query": { "level": "error" },
			"sort": { "timestamp": 1 },
			"maxCursors": 10,
			"watermark": { "timestamp": "2023-01-01T00:00:00Z" }
		}
	}
}
```

## Configuration Parameters

- **url**: MongoDB connection URL. Defaults to `mongodb://localhost:27017/test`.
- **collection**: Name or array of names/patterns of collections to monitor. Patterns can be regular expressions (e.g., `/logs.*/`).
- **query**: MongoDB query object to filter documents. Defaults to `{}`.
- **sort**: MongoDB sort object to order documents. Defaults to `{}`.
- **maxCursors**: Maximum number of concurrent cursors. Defaults to `5`.
- **watermark**: Object specifying the initial watermark for incremental fetching. Example: `{ "timestamp": "2023-01-01T00:00:00Z" }`.
- **options**: MongoDB connection options. See the [MongoDB Node.js driver documentation](https://mongodb.github.io/node-mongodb-native/) for details.

## Output

Each fetch generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'mongo',
	database: '<database name>',
	collection: '<collection name>',
	originalMessage: '<document>'
}
```

### Notes:
- The `originalMessage` field contains the fetched document.
- Watermarks are automatically updated based on the last document fetched.
- If multiple collections are specified, the input will iterate through them in a round-robin fashion.
