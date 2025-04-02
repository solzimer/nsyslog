## Procesador de Parser Syslog

El Procesador de Parser Syslog analiza mensajes syslog en objetos estructurados. Soporta procesamiento tanto en un solo hilo como en múltiples hilos para mejorar el rendimiento.

## Ejemplos

### Ejemplo 1: Parseo en un solo hilo
#### Configuración
```json
"processors": {
	"syslogParser": {
		"type": "syslogparser",
		"config": {
			"field": "${originalMessage}"
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app - - - Mensaje de prueba"
}
```

#### Salida
```json
{
	"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app - - - Mensaje de prueba",
	"syslog": {
		"priority": 34,
		"version": 1,
		"timestamp": "2023-03-15T10:00:00Z",
		"hostname": "host1",
		"appname": "app",
		"message": "Mensaje de prueba"
	}
}
```

---

### Ejemplo 2: Parseo en múltiples hilos
#### Configuración
```json
"processors": {
	"syslogParser": {
		"type": "syslogparser",
		"config": {
			"field": "${originalMessage}",
			"cores": 4
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app - - - Mensaje de prueba"
}
```

#### Salida
```json
{
	"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app - - - Mensaje de prueba",
	"syslog": {
		"priority": 34,
		"version": 1,
		"timestamp": "2023-03-15T10:00:00Z",
		"hostname": "host1",
		"appname": "app",
		"message": "Mensaje de prueba"
	}
}
```

---

### Ejemplo 3: Parseo de línea syslog en formato CEF
#### Configuración
```json
"processors": {
	"syslogParser": {
		"type": "syslogparser",
		"config": {
			"field": "${originalMessage}"
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "<134><165>1 2023-03-15T10:00:00Z host1 app 1234 ID47 [exampleSDID@32473 iut=\"3\" eventSource=\"Application\" eventID=\"1011\"] BOMUn registro de evento de aplicación"
}
```

#### Salida
```json
{
	"originalMessage": "CEF:0|JATP|Cortex|3.6.0.1444|email|Phishing|8|externalId=1499 eventId=14058 lastActivityTime=2016-05-03 23:42:54+00 src= dst= src_hostname= dst_hostname= src_username= dst_username= mailto:src_email_id=src@abc.com dst_email_id={mailto:test1@abc.com,mailto:test2@abc.com,mailto:test3@abc.com} startTime=2016- 05-03 23:42:54+00 url=http://greatfilesarey.asia/QA/files_to_pcaps/ 74280968a4917da52b5555351eeda969.bin http://greatfilesarey.asia/QA/ files_to_pcaps/1813791bcecf3a3af699337723a30882.bin fileHash=bce00351cfc559afec5beb90ea387b03788e4af5 fileType=PE32",
	// ...existing code...
}
```

---

### Ejemplo 4: Parseo de syslog estructurado
#### Configuración
```json
"processors": {
	"syslogParser": {
		"type": "syslogparser",
		"config": {
			"field": "${originalMessage}"
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "<165>1 2023-03-15T10:00:00Z host1 app 1234 ID47 [exampleSDID@32473 iut=\"3\" eventSource=\"Application\" eventID=\"1011\"] BOMUn registro de evento de aplicación"
}
```

#### Salida
```json
{
	"originalMessage": "<165>1 2023-03-15T10:00:00Z host1 app 1234 ID47 [exampleSDID@32473 iut=\"3\" eventSource=\"Application\" eventID=\"1011\"] BOMUn registro de evento de aplicación",
	"pri": "<165>",
	"prival": 165,
	"facilityval": 20,
	"levelval": 5,
	"facility": "local4",
	"level": "notice",
	"version": 1,
	"type": "RFC5424",
	"ts": "2023-03-15T10:00:00.000Z",
	"host": "host1",
	"appName": "app",
	"pid": "1234",
	"messageid": "ID47",
	"message": "BOMUn registro de evento de aplicación",
	"chain": [],
	"structuredData": [
		{
			"$id": "exampleSDID@32473",
			"iut": "3",
			"eventSource": "Application",
			"eventID": "1011"
		}
	],
	"header": "<165>1 2023-03-15T10:00:00Z host1 app 1234 ID47 ",
	"fields": []
}
```

---

## Parámetros de Configuración
* **field**: El campo de entrada que contiene el mensaje syslog a analizar (por defecto: `${originalMessage}`).
* **cores**: El número de núcleos a utilizar para el procesamiento en múltiples hilos (por defecto: `0`, lo que significa un solo hilo).
* **multithreading**: Se habilita automáticamente si `cores` es mayor que `0` y el entorno soporta hilos de trabajo.
