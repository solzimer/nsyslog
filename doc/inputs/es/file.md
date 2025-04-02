## Entrada de Archivo

La entrada de archivo permite leer varios archivos simultáneamente y monitorear archivos o carpetas en busca de cambios, eliminaciones o adiciones. También puede recordar la posición de lectura de cada archivo en caso de reinicio del proceso.

## Ejemplos

### Múltiples archivos en modo de observación
Comienza siempre desde el inicio de cada archivo:
```json
"inputs": {
	"file": {
		"type": "file",
		"config": {
			"path": "/var/log/**/*.log",
			"watch": true,
			"readmode": "offset",
			"offset": "start"
		}
	}
}
```

### Múltiples archivos en modo seguimiento (tail)
Comienza siempre desde el inicio de cada archivo:
```json
"inputs": {
	"file": {
		"type": "file",
		"config": {
			"path": "/var/log/**/*.log",
			"readmode": "offset",
			"offset": "start"
		}
	}
}
```

### Múltiples archivos en modo observación con grabación de desplazamiento
Comienza siempre desde el inicio y registra los desplazamientos para futuros reinicios:
```json
"inputs": {
	"file": {
		"type": "file",
		"config": {
			"path": "/var/log/**/*.log",
			"watch": true,
			"readmode": "watermark",
			"offset": "start"
		}
	}
}
```

## Parámetros de configuración

- **path**: Expresión glob para los archivos monitoreados.
- **exclude**: Expresión glob para los archivos excluidos.
- **watch**: Booleano. Si es `true`, los cambios en los archivos se detectan mediante eventos del sistema operativo, lo que permite detectar modificaciones, eliminaciones o adiciones de archivos. Si es `false`, la entrada leerá nuevas líneas a intervalos fijos.
- **readmode**: Puede ser `offset` o `watermark`.
  - `offset`: Siempre comienza la lectura en el desplazamiento especificado, independientemente de los reinicios del proceso.
  - `watermark`: Recuerda los desplazamientos de archivo, por lo que si el proceso se reinicia, continuará leyendo desde la última posición.
- **offset**: Puede ser `begin`/`start`, `end` o un entero que indica una posición de lectura.
- **encoding**: Por defecto, `utf8`.
- **blocksize**: Tamaño (en bytes) del búfer de lectura.
- **options**: Opciones para el módulo de monitoreo de archivos ([Ver lista completa de opciones](https://github.com/paulmillr/chokidar)).
  - **usePolling**: (por defecto `false`) Determina si se usa `fs.watchFile` (basado en sondeo) o `fs.watch`. Si el sondeo provoca un alto uso de CPU, considera establecerlo en `false`. Suele ser necesario establecerlo en `true` para supervisar archivos a través de una red o en situaciones no estándar. En macOS, si se establece en `true`, sobrescribe la configuración predeterminada de `useFsEvents`. También puedes definir la variable de entorno `CHOKIDAR_USEPOLLING` en `true` (1) o `false` (0) para sobrescribir esta opción.
  - _Configuración específica de sondeo_ (efectiva cuando `usePolling: true`):
    - **interval**: (por defecto `100`) Intervalo de sondeo del sistema de archivos, en milisegundos. También puedes establecer la variable de entorno `CHOKIDAR_INTERVAL` para sobrescribir esta opción.

## Salida

Cada lectura genera un objeto con el siguiente esquema:
```javascript
{
	id: '<input ID>',
	type: 'file',
	path: '<file.path>',
	filename: '<file.filename>',
	ln: '<número de línea>',
	originalMessage: '<línea leída>'
}
```

