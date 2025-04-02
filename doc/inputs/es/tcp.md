## Entrada TCP

La entrada TCP permite consumir mensajes a través de una conexión TCP. Admite manejar múltiples conexiones de clientes y procesa mensajes en tiempo real.

## Ejemplos

### Configuración básica de entrada TCP
```json
"inputs": {
	"tcp": {
		"type": "tcp",
		"config": {
			"host": "0.0.0.0",
			"port": 514,
			"protocol": "tcp4"
		}
	}
}
```

## Parámetros de configuración

- **host**:  
  La dirección del host donde se enlazará el servidor TCP. Por defecto es `0.0.0.0`.

- **port**:  
  El número de puerto en el que escuchar. Por defecto es `514`.

- **protocol**:  
  El protocolo a usar para la conexión TCP. Puede ser `tcp4` o `tcp6`. Por defecto es `tcp4`.

## Salida

Cada mensaje recibido a través de la conexión TCP genera un objeto con el siguiente esquema:
```javascript
{
	originalMessage: '<mensaje en bruto>',
	server: {
		protocol: '<protocolo>',
		port: <puerto>,
		host: '<host>'
	},
	client: {
		address: '<dirección IP del cliente>'
	}
}
```

### Notas:
- El campo `originalMessage` contiene el mensaje en bruto recibido del cliente.
- El campo `server` proporciona detalles sobre la configuración del servidor TCP.
- El campo `client` contiene la dirección IP del cliente que envió el mensaje.
- La entrada admite manejar múltiples conexiones de clientes simultáneamente.
