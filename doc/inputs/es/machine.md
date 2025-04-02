## Entrada Machine

La entrada Machine recopila estadísticas del sistema, como uso de CPU, memoria, disco y interfaces de red. Proporciona actualizaciones en tiempo real sobre el estado de la máquina.

## Ejemplos

Recopilar estadísticas de la máquina cada 30 segundos:
```json
"inputs": {
	"machine": {
		"type": "machine",
		"config": {
			"key": "estadísticas_sistema",
			"interval": 30000
		}
	}
}
```

## Parámetros de configuración
* **key**: Un identificador único para los datos recopilados. Por defecto es `ctx`.
* **interval**: El intervalo en milisegundos para recopilar estadísticas de la máquina. Por defecto es `30000` (30 segundos).

## Salida
Cada recopilación genera un objeto con el siguiente esquema:
```javascript
{
	id: '<ID de entrada>',
	type: 'machine',
	originalMessage: {
		hostname: '<nombre del host>',
		platform: '<plataforma>',
		arch: '<arquitectura>',
		sysUpTime: <tiempo de actividad del sistema en segundos>,
		processUpTime: <tiempo de actividad del proceso en segundos>,
		cpu: [<array de información de CPU>],
		env: {<variables de entorno>},
		ifaces: [
			{
				name: '<nombre de la interfaz>',
				data: [<detalles de la interfaz>]
			}
		],
		disk: [<información del disco>],
		os: {
			version: '<versión del SO>',
			release: '<lanzamiento del SO>'
		},
		cpuLoad: {
			min1: <promedio de carga de 1 minuto>,
			min5: <promedio de carga de 5 minutos>,
			min15: <promedio de carga de 15 minutos>
		},
		memory: {
			total: <memoria total en bytes>,
			free: <memoria libre en bytes>
		}
	}
}
```
