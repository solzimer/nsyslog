## Entrada de servidor HTTP/S

La entrada del servidor HTTP configura un servidor para aceptar solicitudes `PUT` y `POST` a través de HTTP y HTTPS. Cada solicitud genera una entrada que se pasa a los flujos. Los mensajes de solicitud pueden estar en formato de texto sin procesar o en JSON.

## Ejemplos

```json
{
	"inputs": {
		"http": {
			"type": "httpserver",
			"config": {
				"url": "http://0.0.0.0:8888",
				"format": "json"
			}
		},
		"https": {
			"type": "httpserver",
			"config": {
				"url": "https://0.0.0.0:8889",
				"format": "json",
				"tls": {
					"rejectUnauthorized": false,
					"cert": "/path/to/server.crt",
					"key": "/path/to/server.key"
				}
			}
		}
	}
}
```

## Parámetros de configuración

- **url**: Patrón de enlace de la URL del servidor. Sigue el formato `<protocolo>://<host de enlace>:<puerto de enlace>`. Los protocolos admitidos son **http** y **https**.
- **tls**: Un objeto pasado al socket del servidor TLS, como se describe en la [documentación de Node.js](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
- **format**: Formato del mensaje. Si se especifica, debe establecerse en **json**.

## Salida

Cada solicitud HTTP/S genera un objeto con el siguiente esquema:

```javascript
{
	id: '<input ID>',
	type: 'httpserver',
	timestamp: Date.now(),
	originalMessage: '<cuerpo de la solicitud HTTP>',
	server: {
		protocol: '<protocolo de enlace>',
		port: '<puerto de enlace>',
		host: '<host de enlace>'
	},
	client: {
		address: '<dirección del cliente>',
		port: '<puerto del cliente>'
	}
}
```

### Notas:
- El campo `originalMessage` contiene el cuerpo de la solicitud HTTP.
- El objeto `server` proporciona detalles sobre el protocolo, puerto y host del servidor.
- El objeto `client` incluye la dirección IP y el puerto del cliente.

