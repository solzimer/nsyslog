## Entrada de Windows

La entrada de Windows es capaz de leer los registros de eventos de Windows y mantener un marcador de posición para la lectura incremental de datos. Funciona en Windows 7 y versiones posteriores, ya que depende de la utilidad de línea de comandos `wevtutil`.

## Ejemplos

### Ejemplo 1: Leer del canal 'Application' con marcador de posición
```json
"inputs": {
	"windows": {
		"type": "windows",
		"config": {
			"readmode": "watermark",
			"offset": "begin",
			"channel": "Application",
			"batchsize": 5000,
			"idfilter": [902, 903]
		}
	}
}
```

### Ejemplo 2: Leer del canal 'Security' comenzando desde la última entrada
```json
"inputs": {
	"windows": {
		"type": "windows",
		"config": {
			"readmode": "offset",
			"offset": "end",
			"channel": "Security",
			"batchsize": 1000
		}
	}
}
```

### Ejemplo 3: Leer del canal 'System' de una máquina remota
```json
"inputs": {
	"windows": {
		"type": "windows",
		"config": {
			"readmode": "watermark",
			"offset": "begin",
			"channel": "System",
			"remote": "192.168.1.100",
			"username": "admin",
			"password": "password123",
			"batchsize": 2000
		}
	}
}
```

### Ejemplo 4: Filtrar eventos por una fecha específica
```json
"inputs": {
	"windows": {
		"type": "windows",
		"config": {
			"readmode": "offset",
			"offset": "2023-01-01T00:00:00",
			"channel": "Application",
			"batchsize": 1000
		}
	}
}
```

## Parámetros de configuración

- **channel**:  
  El nombre del canal de registro de eventos de Windows del que leer (por ejemplo, `Application`, `Security`, `System`).

- **readmode**:  
  Especifica el modo de lectura.  
  - **offset**: Siempre comienza a leer desde el desplazamiento especificado, independientemente de los reinicios del proceso.  
  - **watermark**: Recuerda la última posición leída y continúa desde allí después de un reinicio.

- **offset**:  
  Especifica el punto de inicio para leer eventos.  
  - Puede ser uno de los siguientes:  
    - **begin** o **start**: Comienza a leer desde la entrada más antigua.  
    - **end**: Comienza a leer desde la entrada más reciente.  
    - Una fecha específica en el formato `YYYY-MM-DDTHH:mm:ss`.

- **batchsize**:  
  El número de eventos a leer a la vez. Por defecto es `1000`.

- **interval**:  
  El intervalo (en milisegundos) para esperar cuando no hay datos disponibles. Por defecto es `500`.

- **idfilter**:  
  Una lista de IDs de eventos para filtrar. Solo se leerán eventos con estos IDs. Opcional.

- **remote**:  
  El nombre de host o dirección IP de una máquina remota desde la que leer eventos. Opcional.

- **username**:  
  El nombre de usuario para acceder a la máquina remota. Obligatorio si se especifica `remote`.

- **password**:  
  La contraseña para acceder a la máquina remota. Obligatorio si se especifica `remote`.

## Salida

Cada operación de lectura genera un objeto con el siguiente esquema:
```javascript
{
	id: '<ID de entrada>',
	type: 'windows',
	ts: '<Marca de tiempo del evento>',
	Event: '<Datos JSON del evento>'
}
```

### Ejemplo de salida
```json
{
	"channel": "Application",
	"originalMessage": {
		"xmlns": "http://schemas.microsoft.com/win/2004/08/events/event",
		"System": {
			"Provider": {
				"Name": "MsiInstaller"
			},
			"EventID": {
				"_": "1035",
				"Qualifiers": "0"
			},
			"Level": "4",
			"Task": "0",
			"Keywords": "0x80000000000000",
			"TimeCreated": {
				"SystemTime": "2023-02-09T09:21:32.000000000Z"
			},
			"EventRecordID": "244031",
			"Channel": "Application",
			"Computer": "localhost",
			"Security": {
				"UserID": "S-1-5-18"
			}
		},
		"EventData": {
			"Data": [
				"Microsoft .NET Framework 4.5.1 RC Multi-Targeting Pack for Windows Store Apps (ENU)",
				"4.5.21005",
				"1033",
				"0",
				"Microsoft Corporation",
				"(NULL)",
				""
			],
			"Binary": "7B4132323342"
		},
		"SystemTime": "2023-02-09T09:21:32.000000000Z"
	},
	"input": "windows",
	"type": "windows"
}
```

## Notas

- El parámetro `readmode` determina si la entrada recuerda su posición después de un reinicio.
- El parámetro `idfilter` puede usarse para limitar los eventos a IDs específicos, reduciendo el procesamiento innecesario.
- Al usar el parámetro `remote`, asegúrese de que la máquina remota sea accesible y que las credenciales proporcionadas tengan permisos suficientes para leer los registros de eventos.
- El parámetro `offset` puede usarse para comenzar a leer desde una fecha específica, lo cual es útil para el análisis de datos históricos.
