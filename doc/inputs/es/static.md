## Entrada Estática

La Entrada Estática proporciona datos estáticos predefinidos como entrada. Es útil para pruebas o escenarios donde se necesita procesar un conjunto fijo de datos.

## Ejemplos

### Entrada estática con bucle
```json
"inputs": {
	"static": {
		"type": "static",
		"config": {
			"lines": [
				"<134>Jan 10 10:00:00 host CEF:0|Vendor|Product|Version|Signature|Name|Severity|src=192.168.1.1 dst=192.168.1.2 spt=12345 dpt=80 msg=Mensaje de prueba 1",
				"<134>Jan 10 10:01:00 host CEF:0|Vendor|Product|Version|Signature|Name|Severity|src=192.168.1.3 dst=192.168.1.4 spt=54321 dpt=443 msg=Mensaje de prueba 2",
				"<134>Jan 10 10:02:00 host CEF:0|Vendor|Product|Version|Signature|Name|Severity|src=10.0.0.1 dst=10.0.0.2 spt=22 dpt=22 msg=Intento de conexión SSH"
			],
			"loop": true,
			"interval": 1000
		}
	}
}
```

### Entrada estática sin bucle
```json
"inputs": {
	"static": {
		"type": "static",
		"config": {
			"lines": [
				"<134>Jan 10 10:00:00 host CEF:0|Vendor|Product|Version|Signature|Name|Severity|src=192.168.1.1 dst=192.168.1.2 spt=12345 dpt=80 msg=Mensaje de prueba 1",
				"<134>Jan 10 10:01:00 host CEF:0|Vendor|Product|Version|Signature|Name|Severity|src=192.168.1.3 dst=192.168.1.4 spt=54321 dpt=443 msg=Mensaje de prueba 2"
			],
			"loop": false
		}
	}
}
```

## Parámetros de Configuración

- **lines**:  
  Un array de cadenas que representan las líneas estáticas que se devolverán como entrada. Por defecto, es un array vacío.

- **loop**:  
  Un booleano que indica si se debe recorrer las líneas indefinidamente.  
  - Si es `true`, la entrada volverá a empezar desde la primera línea al llegar al final.  
  - Si es `false`, la entrada se detendrá después de procesar todas las líneas.  
  Por defecto, es `false`.

- **interval**:  
  El intervalo en milisegundos entre cada línea que se devuelve.  
  - Si se establece en `0`, las líneas se devuelven lo más rápido posible.  
  Por defecto, es `0`.

## Salida

Cada línea genera un objeto con el siguiente esquema:
```javascript
{
	id: '<ID de entrada>',
	type: 'static',
	originalMessage: '<línea>'
}
```

### Notas:
- El campo `originalMessage` contiene la línea estática que se devuelve.
- Si el `loop` está habilitado, la entrada recorrerá continuamente las líneas.
- El parámetro `interval` se puede usar para controlar la velocidad a la que se devuelven las líneas.
