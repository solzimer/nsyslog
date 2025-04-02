## Entrada de Comando

Obtiene datos de la ejecución de un comando de shell.

## Ejemplos

Listar carpetas cada 2 segundos (modo exec):
```json
"inputs" : {
	"list" : {
		"type" : "command",
		"config" : {
			"cmd" : "ls -la",
			"mode" : "exec",
			"interval" : 2000,
			"options" : {				
				"cwd" : "/var/log"
			}
		}
	}
}
```

Monitorear un archivo de registro (modo spawn):
```json
"inputs" : {
	"monitor" : {
		"type" : "command",
		"config" : {
			"cmd" : "tail",
			"mode" : "spawn",
			"args" : ["-f", "/var/log/syslog"],
			"options" : {				
				"cwd" : "/var/log"
			}
		}
	}
}
```

## Parámetros de configuración
* **cmd** : Comando a ejecutar.
* **mode** : Modo de ejecución. Puede ser `exec` (por defecto) o `spawn`.
* **interval** : Número de milisegundos para ejecutar el siguiente comando. Si no se especifica, esta entrada se comporta como una entrada de extracción (los datos se obtendrán cuando el flujo lo requiera). Si se establece, se comporta como una entrada de inserción (los datos se obtendrán en intervalos regulares).
* **args** : Array de argumentos para pasar al comando (usado con el modo `spawn`).
* **options** : Opciones pasadas al comando exec o spawn, como se describe en la [documentación de NodeJS](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback).

## Salida
Cada llamada exec o spawn generará objetos con el siguiente esquema:
```javascript
{
	id : '<ID de entrada>',
	type : 'command',
	cmd : '<comando>',
	stream : '<stdout|stderr|exit>', // Solo para el modo spawn
	originalMessage : '<datos sin procesar>'
}
```
