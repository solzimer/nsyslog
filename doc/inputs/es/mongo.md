## Entrada MongoDB

La entrada MongoDB permite obtener datos de colecciones de MongoDB. Soporta consultas a múltiples colecciones, manejo de marcas de agua para la obtención incremental de datos y gestión de cursores concurrentes.

## Ejemplos

### Obtener datos de una colección de MongoDB
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

### Obtener datos de múltiples colecciones con patrones
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

## Parámetros de configuración

- **url**: URL de conexión a MongoDB. Por defecto, `mongodb://localhost:27017/test`.
- **collection**: Nombre o array de nombres/patrones de colecciones a monitorizar. Los patrones pueden ser expresiones regulares (por ejemplo, `/logs.*/`).
- **query**: Objeto de consulta de MongoDB para filtrar documentos. Por defecto, `{}`.
- **sort**: Objeto de ordenación de MongoDB para ordenar documentos. Por defecto, `{}`.
- **maxCursors**: Número máximo de cursores concurrentes. Por defecto, `5`.
- **watermark**: Objeto que especifica la marca de agua inicial para la obtención incremental. Ejemplo: `{ "timestamp": "2023-01-01T00:00:00Z" }`.
- **options**: Opciones de conexión a MongoDB. Consulte la [documentación del controlador de MongoDB para Node.js](https://mongodb.github.io/node-mongodb-native/) para más detalles.

## Salida

Cada obtención genera un objeto con el siguiente esquema:
```javascript
{
	id: '<ID de entrada>',
	type: 'mongo',
	database: '<nombre de la base de datos>',
	collection: '<nombre de la colección>',
	originalMessage: '<documento>'
}
```

### Notas:
- El campo `originalMessage` contiene el documento obtenido.
- Las marcas de agua se actualizan automáticamente en función del último documento obtenido.
- Si se especifican múltiples colecciones, la entrada las iterará en un orden circular.
