## Entrada HTTP/S

Obtiene datos de una URL HTTP o HTTPS utilizando el método GET.

## Ejemplos

### Obtener datos cada 2 segundos con autenticación básica
```json
"inputs": {
	"httpauth": {
		"type": "http",
		"config": {
			"url": "https://jigsaw.w3.org/HTTP/Basic/",
			"interval": 2000,
			"options": {
				"auth": {
					"user": "guest",
					"password": "guest"
				}
			}
		}
	}
}
```

### Obtener datos de un servicio REST JSON por HTTPS
```json
"inputs": {
	"httprest": {
		"type": "http",
		"config": {
			"url": "https://jsonplaceholder.typicode.com/todos/1",
			"interval": 2000,
			"options": {},
			"tls": {
				"rejectUnauthorized": false
			}
		}
	}
}
```

## Parámetros de configuración

* **url**: URL desde la que obtener los datos.
* **interval**: Número de milisegundos entre cada obtención de datos. Si no se especifica, esta entrada funciona como una entrada pull (los datos se obtienen cuando el flujo lo requiere). Si se establece, funciona como una entrada push (los datos se obtienen en intervalos fijos).
* **options**: Opciones pasadas al cliente HTTP, como se describe en el [módulo Request](https://www.npmjs.com/package/request#requestoptions-callback).
* **tls**: Opciones TLS según la [documentación de NodeJS](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
* **retry**: Número de milisegundos a esperar antes de reintentar una solicitud fallida. Si no se especifica, no se realizarán reintentos.

## Salida

Cada llamada HTTP generará un objeto con el siguiente esquema:
```javascript
{
	id: '<input ID>',
	type: 'http',
	url: '<URL>',
	statusCode: '<Código de estado HTTP>',
	headers: '<Cabeceras de respuesta>',
	originalMessage: '<datos en bruto>'
}
```

