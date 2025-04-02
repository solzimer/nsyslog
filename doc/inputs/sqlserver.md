## SQL Server Input

The SQL Server Input allows fetching rows from Microsoft SQL Server tables. It supports incremental data fetching using watermarks and can handle large datasets efficiently.

## Examples

### Fetch rows with integrated security
```json
"inputs": {      
	"sqlserver": {
		"type": "sqlserver",
		"config": {
			"query": "SELECT TOP (1000) [Index], [Height_Inches], [Weight_Pounds] FROM hw_25000 WHERE [Index] > ${Index}",
			"watermark": { "Index": 0 },
			"mode": "watermark",
			"options": {
				"database": "LogsDB",
				"server": "localhost",
				"pool": {
					"max": 10,
					"min": 0,
					"idleTimeoutMillis": 30000
				},
				"options": {
					"trustedConnection": true
				}
			}
		}
	}
}
```

## Configuration Parameters

- **query**:  
  SQL query to fetch rows. The query can be parameterized using attributes from the last fetched row. Initially, when no rows have been fetched, the `watermark` object is used as the parameter source.

- **watermark**:  
  An object specifying the initial watermark for parameterizing the query. Subsequent executions will use the last fetched row as the watermark.

- **mode**:  
  Specifies the watermark handling mode.  
  - **start**: Always starts using the `watermark` object as the initial state.  
  - **watermark**: Uses the last fetched row as the watermark for subsequent executions.

- **options**:  
  Connection and configuration options for SQL Server. See the full specification in the [Tedious documentation](http://tediousjs.github.io/tedious/api-connection.html#function_newConnection).  
  Example options include:  
  - **database**: Name of the database to connect to.  
  - **server**: SQL Server hostname or IP address.  
  - **pool**: Connection pool settings, such as `max`, `min`, and `idleTimeoutMillis`.  
  - **options**: Additional connection options, such as `trustedConnection`, `encrypt`, and `trustServerCertificate`.

## Output

Each query execution generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'sqlserver',
	database: '<database name>',
	originalMessage: '<row data>'
}
```

### Example Output
```json
{
	"id": "sqlserver",
	"type": "sqlserver",
	"database": "LogsDB",
	"originalMessage": {
		"Index": 26100,
		"Height_Inches": 4739,
		"Weight_Pounds": 7900
	}
}
```

### Notes:
- The `originalMessage` field contains the row data fetched from the SQL Server table.
- The `watermark` is automatically updated based on the last fetched row.
- The input supports both integrated security and SQL authentication.
- Connection pooling is supported for efficient resource management.
