## Entrada UDP

La entrada UDP permite consumir mensajes a través de una conexión UDP. Es ligera y adecuada para escenarios donde se requiere una entrega de mensajes de baja latencia.

## Ejemplos

### Configuración básica de entrada UDP
```json
"inputs": {
	"udp": {
		"type": "udp",
		"config": {
			"host": "0.0.0.0",
			"port": 514,
			"protocol": "udp4"
		}
	}
}
```

## Parámetros de configuración

- **host**:  
  La dirección del host donde se enlazará el servidor UDP. Por defecto es `0.0.0.0`.

- **port**:  
  El número de puerto en el que escuchar. Por defecto es `514`.

- **protocol**:  
  El protocolo a usar para la conexión UDP. Puede ser `udp4` o `udp6`. Por defecto es `udp4`.

## Salida

Cada mensaje recibido a través de la conexión UDP genera un objeto con el siguiente esquema:
```javascript
{
	originalMessage: '<mensaje en bruto>',
	server: {
		protocol: '<protocolo>',
		port: <puerto>,
		interface: '<host>'
	},
	client: {
		address: '<dirección IP del cliente>'
	}
}
```

### Notas:
- El campo `originalMessage` contiene el mensaje en bruto recibido del cliente.
- El campo `server` proporciona detalles sobre la configuración del servidor UDP.
- El campo `client` contiene la dirección IP del cliente que envió el mensaje.
- UDP no tiene conexión, por lo que los mensajes pueden llegar fuera de orden o perderse en tránsito.
