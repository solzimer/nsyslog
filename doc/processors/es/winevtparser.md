## Procesador de Parser de Registros de Eventos de Windows

El Procesador de Parser de Registros de Eventos de Windows analiza mensajes XML de registros de eventos de Windows en objetos JSON estructurados. Remapea campos para facilitar el procesamiento.

## Ejemplos

### Ejemplo 1: Analizar un mensaje de registro de eventos de Windows
#### Configuración
```json
"processors": {
	"winevtParser": {
		"type": "winevtparser",
		"config": {
			"input": "${originalMessage}",
			"output": "eventData"
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "<Event><System><TimeCreated SystemTime=\"2023-03-15T10:00:00Z\"/><EventID Qualifiers=\"0\">4624</EventID></System><EventData><Data Name=\"TargetUserName\">JohnDoe</Data><Data Name=\"TargetDomainName\">DOMAIN</Data></EventData></Event>"
}
```

#### Salida
```json
{
	"originalMessage": "<Event><System><TimeCreated SystemTime=\"2023-03-15T10:00:00Z\"/><EventID Qualifiers=\"0\">4624</EventID></System><EventData><Data Name=\"TargetUserName\">JohnDoe</Data><Data Name=\"TargetDomainName\">DOMAIN</Data></EventData></Event>",
	"eventData": {
		"Event": {
			"System": {
				"TimeCreated": {
					"SystemTime": "2023-03-15T10:00:00Z"
				},
				"EventID": 4624,
				"Qualifiers": "0"
			},
			"EventData": {
				"Data": {
					"TargetUserName": "JohnDoe",
					"TargetDomainName": "DOMAIN"
				}
			}
		}
	}
}
```

---

## Parámetros de Configuración
* **input**: Expresión para extraer el mensaje XML (por defecto: `${originalMessage}`).
* **output**: Campo donde se almacenará el objeto JSON analizado.
