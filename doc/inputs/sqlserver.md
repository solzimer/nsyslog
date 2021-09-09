## SQL Server Input

Permite la lectura de registros de tablas de Microsoft SQL Server

## Examples

Lectura de una table con seguridad integrada.
```json
"inputs": {      
	"sqlserver": {
		"type": "sqlserver",
		"config": {
			"query": "select TOP (1000) [Index],[Height_Inches],[Weight_Pounds] from hw_25000 where [Index] > ${Index}",
			"watermark": {"Index": 0},
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
					"trustedConnection": false,
				}
			}
		}
	}
}
```

## Configuration parameters
* **query** : Consulta SQL sobra la que se obtienen los registros (filas). Es parametrizable, usando como valores los atributos del último registro leido. Inicialmente, al no haber "ultimo registro", se usa el objeto *watermark*
* **watermark** : Fila inicial para la parametrización de la consulta. Las posteriores ejecuciones usarán el último registro leido.
* **mode** : Puede ser **start** or **watermark**. Cuando es **start**, el input siempre inicia usando como último registro el objeto *watermark* especificado. En caso de usar el modo **watermark**, las posteriores ejecuciones usarán el último registro leído.
* **options** : Opciones de conexión y configuración del acceso a SQL Server. Se puede ver la especificación completa en [http://tediousjs.github.io/tedious/api-connection.html#function_newConnection](http://tediousjs.github.io/tedious/api-connection.html#function_newConnection)

## Output
Cada lectura generará un objeto con el siguiente esquema:
```javascript
{
	id : '<input ID>',
	type : 'sqlserver',
	database: '<dbname>',
	originalMessage : '<String value or JSON object>'
}
```

### Ejemplo
```json
{
	"id":"sqlserver",
	"type":"sqlserver",
	"database":"LogsDB",
	"input":"sqlserver",
	"originalMessage":{
		"Index":26100,
		"Height_Inches":4739,
		"Weight_Pounds":7900
	}
}
```
