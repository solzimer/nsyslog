## CEF Out

Convierte entradas de registro en cadenas en formato Common Event Format (CEF).

## Ejemplos

Configuración básica de salida CEF:
```json
"processors": {
	"cef": {
		"type": "cefout",
		"config": {
			"input": "${originalMessage}",
			"output": "cefMessage",
			"headers": {
				"DeviceVendor": "MyVendor",
				"DeviceProduct": "MyProduct",
				"DeviceVersion": "1.0",
				"SignatureID": "12345",
				"Name": "MyEvent",
				"Severity": "5"
			}
		}
	}
}
```

### Ejemplo de entrada
```json
{
	"originalMessage": {
		"eventId": "1001",
		"source": "Application",
		"message": "An error occurred",
		"timestamp": "2023-10-01T12:00:00Z"
	}
}
```

### Ejemplo de salida
```json
{
	"cefMessage": "CEF:0|MyVendor|MyProduct|1.0|12345|MyEvent|5|eventId=1001 source=Application message=An error occurred timestamp=2023-10-01T12:00:00Z"
}
```

## Parámetros de configuración

* **input**: Campo de entrada que contiene los datos a convertir al formato CEF.  
  Por defecto: `${originalMessage}`.

* **output**: Campo de salida para almacenar la cadena CEF resultante.  
  Por defecto: `cef`.

* **headers**: Opcional. Cabeceras personalizadas para el mensaje CEF. Si no se proporcionan, se usarán cabeceras por defecto.  
  Cabeceras por defecto:
  - **CEFVersion**: `0`
  - **DeviceVendor**: `localdomain`
  - **DeviceProduct**: `localdomain`
  - **DeviceVersion**: `0`
  - **SignatureID**: `0`
  - **Name**: `localdomain`
  - **Severity**: `0`
