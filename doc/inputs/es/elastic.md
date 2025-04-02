## Entrada de Elastic

La entrada de Elastic permite obtener datos de un clúster de Elasticsearch. Admite la consulta de índices, la gestión de marcas de agua para la extracción incremental de datos y el procesamiento por lotes de resultados.

## Ejemplos

### Obtener datos de Elasticsearch con una consulta
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

## Parámetros de configuración

- **url**: Lista de URLs de nodos de Elasticsearch. Compatible con HTTP y HTTPS.
- **index**: Patrón o nombre del índice a consultar. Se puede evaluar dinámicamente mediante expresiones.
- **query**: Objeto de consulta de Elasticsearch. Por defecto es `{ match: {} }`.
- **batchsize**: Número de documentos a recuperar por consulta. Por defecto es `100`.
- **interval**: Intervalo en milisegundos para obtener el siguiente lote de datos. Si no se especifica, los datos se recuperan bajo demanda.
- **sort**: Lista de campos por los que ordenar los resultados de la consulta. Ejemplo: `["@timestamp:asc"]`.
- **watermark**: Objeto que especifica la marca de agua inicial para la extracción incremental. Ejemplo: `{ "@timestamp": "2023-01-01T00:00:00Z" }`.
- **tls**: Configuración TLS para conexiones HTTPS. Consulta la [documentación de TLS de Node.js](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) para más detalles.
- **options**: Opciones adicionales para el cliente de Elasticsearch, como la autenticación. Consulta la [documentación del cliente JavaScript de Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-configuration.html) para una lista completa de opciones disponibles. Ejemplos:
  - `maxRetries`: Número máximo de reintentos para solicitudes fallidas. Ejemplo: `{ "maxRetries": 3 }`.
  - `requestTimeout`: Tiempo de espera en milisegundos para las solicitudes. Ejemplo: `{ "requestTimeout": 30000 }`.
  - `sniffOnStart`: Habilita la detección automática de nodos al iniciar el cliente. Ejemplo: `{ "sniffOnStart": true }`.

## Salida

Cada consulta genera un objeto con el siguiente esquema:
```javascript
{
	id: '<input ID>',
	type: 'elastic',
	index: '<índice consultado>',
	originalMessage: '<fuente del documento>'
}
```

### Notas:
- El campo `originalMessage` contiene el `_source` del documento recuperado.
- Las marcas de agua se actualizan automáticamente según el último documento recuperado.
- Si se establece el `interval`, la entrada funciona como una entrada push, obteniendo datos periódicamente. De lo contrario, funciona como una entrada pull, recuperando datos bajo demanda.

