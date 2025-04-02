## Entrada de SQL Server

La entrada de SQL Server permite obtener filas de tablas de Microsoft SQL Server. Admite la extracción incremental de datos mediante marcas de agua y puede manejar grandes conjuntos de datos de manera eficiente.

## Ejemplos

### Obtener filas con seguridad integrada
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

## Parámetros de configuración

- **query**:  
  Consulta SQL para obtener filas. La consulta puede estar parametrizada utilizando atributos de la última fila recuperada. Inicialmente, cuando no se han recuperado filas, el objeto `watermark` se usa como fuente de parámetros.

- **watermark**:  
  Un objeto que especifica la marca de agua inicial para parametrizar la consulta. En ejecuciones posteriores, se utilizará la última fila obtenida como marca de agua.

- **mode**:  
  Especifica el modo de manejo de la marca de agua.  
  - **start**: Siempre comienza usando el objeto `watermark` como estado inicial.  
  - **watermark**: Usa la última fila obtenida como marca de agua para las ejecuciones siguientes.

- **options**:  
  Opciones de conexión y configuración para SQL Server. Consulta la especificación completa en la [documentación de Tedious](http://tediousjs.github.io/tedious/api-connection.html#function_newConnection).  
  Ejemplos de opciones:  
  - **database**: Nombre de la base de datos a la que conectarse.  
  - **server**: Nombre de host o dirección IP del servidor SQL Server.  
  - **pool**: Configuración del pool de conexiones, como `max`, `min` y `idleTimeoutMillis`.  
  - **options**: Opciones de conexión adicionales, como `trustedConnection`, `encrypt` y `trustServerCertificate`.

## Salida

Cada ejecución de consulta genera un objeto con el siguiente esquema:
```javascript
{
	id: '<input ID>',
	type: 'sqlserver',
	database: '<nombre de la base de datos>',
	originalMessage: '<datos de la fila>'
}
```

### Ejemplo de salida
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

### Notas:
- El campo `originalMessage` contiene los datos de la fila obtenida de la tabla de SQL Server.
- La `watermark` se actualiza automáticamente en base a la última fila recuperada.
- La entrada admite tanto seguridad integrada como autenticación SQL.
- Se admite el uso de pools de conexiones para una gestión eficiente de los recursos.

