## Entrada HTTPSM

La entrada HTTPSM permite obtener datos de endpoints HTTP/HTTPS de manera impulsada por una máquina de estados. Soporta transiciones de estado dinámicas, lógica condicional y almacenamiento de datos entre estados.

## Ejemplos

Obtener datos de la API de VirusTotal con inicio de sesión y llamada posterior a la API:
```json
"inputs": {
	"vt_api": {
		"type": "httpsm",
		"disabled": false,
		"config": {
			"start": "login",
			"states": {
				"login": {
					"options": {
						"method": "POST",
						"url": "https://www.virustotal.com/api/v3/auth/login",
						"headers": {
							"Content-Type": "application/json"
						},
						"body": {
							"username": "tu_usuario",
							"password": "tu_contraseña"
						},
						"json": true
					},
					"emit": [
						{
							"when": "${res.statusCode} == 200",
							"store": { "token": "${body.token}" },
							"next": "getReport",
							"timeout": 10000,
							"log": { "level": "info", "message": "Inicio de sesión exitoso" }
						},
						{
							"when": "${res.statusCode} != 200",
							"next": "login",
							"timeout": 60000,
							"log": { "level": "error", "message": "Error en el inicio de sesión: ${body.error}" }
						}
					]
				},
				"getReport": {
					"options": {
						"method": "GET",
						"url": "https://www.virustotal.com/api/v3/files/{file_id}",
						"headers": {
							"Authorization": "Bearer ${token}"
						}
					},
					"emit": [
						{
							"when": "${res.statusCode} == 200",
							"publish": "${body}",
							"next": "getReport",
							"timeout": 30000,
							"log": { "level": "info", "message": "Informe obtenido con éxito" }
						},
						{
							"when": "${res.statusCode} != 200",
							"next": "login",
							"timeout": 60000,
							"log": { "level": "error", "message": "Error al obtener el informe: ${body.error}" }
						}
					]
				}
			}
		}
	}
}
```

## Parámetros de configuración
* **start**: El estado inicial para comenzar la máquina de estados. Puede evaluarse dinámicamente utilizando expresiones.
* **states**: Un objeto que define los estados de la máquina de estados. Cada estado incluye:
  - **url**: La URL del endpoint desde donde obtener datos.
  - **options**: Opciones de la solicitud HTTP, como método, cabeceras y cuerpo.
  - **emit**: Un array de condiciones y acciones a realizar basadas en la respuesta. Cada emit incluye:
    - **when**: Una condición para evaluar la respuesta.
    - **next**: El siguiente estado al que transicionar.
    - **timeout**: Tiempo de espera en milisegundos antes de la siguiente obtención.
    - **store**: Datos a almacenar para su uso en estados posteriores.
    - **publish**: Datos a publicar como salida de la entrada.
    - **log**: Configuración de registro para la transición de estado.

## Salida
Cada obtención genera un objeto con el siguiente esquema:
```javascript
{
	id: '<ID de entrada>',
	type: 'httpsm',
	url: '<URL solicitada>',
	statusCode: <código de estado HTTP>,
	headers: { <cabeceras de respuesta> },
	httpVersion: '<versión HTTP>',
	originalMessage: '<cuerpo de la respuesta>'
}
```
