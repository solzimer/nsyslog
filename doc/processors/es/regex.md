## Procesador Regex

Procesa entradas de registro utilizando expresiones regulares para extraer campos.

## Ejemplos
```json
"processors": {
	"regex": {
		"type": "regex",
		"config": {
			"regex": "([a-z]{3} [0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}) ([a-z0-9]+) ([a-zA-Z0-9]+)\\[([0-9]+)\\]: \\(([a-zA-Z0-9]+)\\) CMDOUT \\((.*)\\)",
			"fields": ["date", "host", "process", "pid", "user", "message"],
			"input": "${originalMessage}",
			"output": "event"
		}
	}
}
```

### Entrada
```json
{
	"originalMessage": "mar 12 11:30:02 host1 CROND[1425251]: (host1) CMDOUT (TypeError: Cannot read properties of undefined (reading 'replace'))"
}
```

### Salida
```json
{
	"originalMessage": "mar 12 11:30:02 host1 CROND[1425251]: (host1) CMDOUT (TypeError: Cannot read properties of undefined (reading 'replace'))",
	"event": {
		"date": "mar 12 11:30:02",
		"host": "host1",
		"process": "CROND",
		"pid": "1425251",
		"user": "host1",
		"message": "TypeError: Cannot read properties of undefined (reading 'replace')"
	}
}
```

## Parámetros de Configuración
* **regex**: La expresión regular para coincidir con el mensaje de entrada.
* **fields**: Un array de nombres de campos correspondientes a los grupos capturados por la expresión regular.
* **input**: Expresión para extraer el mensaje de entrada (por defecto: `${originalMessage}`).
* **output**: Campo de salida para almacenar los campos extraídos (opcional).
