## Procesador HTTP

El procesador HTTP permite enviar entradas de registro a un endpoint HTTP. El resultado de la llamada HTTP se combina con el objeto de entrada del procesador.

## Ejemplos
```json
"processors": {
	"http": {
		"type": "http",
		"config": {
			"url": "http://example.com/logs",
			"method": "POST",
			"headers": {
				"Content-Type": "application/json"
			},
			"body": "${entry}"
		}
	}
}
```

## Parámetros de configuración
* **url**: La URL del endpoint HTTP.
* **method**: Método HTTP a utilizar (por ejemplo, GET, POST).
* **headers**: Objeto que contiene los encabezados HTTP.
* **body**: Expresión para generar el cuerpo de la solicitud HTTP.
* **response handling**: La respuesta HTTP se analiza y se combina con la entrada original del registro.
