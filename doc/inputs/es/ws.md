## Entrada WebSocket

La entrada WebSocket crea un servidor WebSocket para recibir mensajes de los clientes. Soporta conexiones WebSocket tanto simples como seguras (TLS). Los mensajes pueden procesarse en formato bruto o JSON.

## Ejemplos

### Ejemplo 1: Servidor WebSocket simple en el puerto 8080
```json
"inputs": {
	"ws": {
		"type": "ws",
		"config": {
			"url": "ws://127.0.0.1:8080",
			"format": "raw"
		}
	}
}
```

### Ejemplo 2: Servidor WebSocket seguro con TLS
```json
"inputs": {
	"ws": {
		"type": "ws",
		"config": {
			"url": "wss://127.0.0.1:3000",
			"format": "json",
			"tls": {
				"key": "server.key",
				"cert": "server.crt"
			}
		}
	}
}
```

### Ejemplo 3: Servidor WebSocket con opciones TLS personalizadas
```json
"inputs": {
	"ws": {
		"type": "ws",
		"config": {
			"url": "wss://0.0.0.0:8443",
			"format": "json",
			"tls": {
				"key": "custom.key",
				"cert": "custom.crt",
				"ca": ["ca1.crt", "ca2.crt"]
			}
		}
	}
}
```

## Parámetros de configuración

- **url**:  
  La URL de enlace para el servidor WebSocket. Ejemplo: `ws://127.0.0.1:8080` o `wss://127.0.0.1:3000`.

- **format**:  
  Especifica el formato del mensaje.  
  - **raw**: El contenido bruto del mensaje se coloca en el campo `originalMessage`.  
  - **json**: El contenido del mensaje se analiza como un objeto JSON y se coloca en el campo `originalMessage`.

- **tls**:  
  Opciones TLS para conexiones WebSocket seguras.  
  - **key**: Ruta al archivo de clave privada.  
  - **cert**: Ruta al archivo de certificado.  
  - **ca**: Array de rutas a archivos de autoridades certificadoras (opcional).  
  Consulte la [documentación TLS de Node.js](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) para más detalles.

## Salida

Cada mensaje recibido de un cliente WebSocket genera un objeto con el siguiente esquema:
```javascript
{
	id: '<ID de entrada>',
	type: 'ws',
	originalMessage: '<datos brutos u objeto JSON>'
}
```

### Notas:
- Si el `format` está configurado como **json**, la entrada intentará analizar el contenido del mensaje como JSON. Si el análisis falla, se registrará una advertencia y se devolverá el mensaje en bruto.
- El servidor WebSocket soporta múltiples conexiones concurrentes de clientes.
- WebSocket seguro (wss) requiere certificados TLS válidos para establecer conexiones cifradas.
