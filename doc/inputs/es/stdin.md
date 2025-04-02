## Entrada Estándar

La Entrada Estándar (stdin) permite leer datos del flujo de entrada estándar del proceso. Admite tanto texto sin formato como entrada en formato JSON, lo que la hace útil para pruebas o escenarios donde los datos se canalizan hacia la aplicación.

## Ejemplos

### Entrada estándar con formato sin procesar
```json
"inputs": {
	"stdin": {
		"type": "stdin",
		"config": {
			"format": "raw"
		}
	}
}
```

### Entrada estándar con formato JSON
```json
"inputs": {
	"stdin": {
		"type": "stdin",
		"config": {
			"format": "json"
		}
	}
}
```

## Parámetros de Configuración

- **format**:  
  Especifica el formato de los datos de entrada.  
  - **raw**: Cada línea se trata como una cadena sin procesar.  
  - **json**: Cada línea se analiza como un objeto JSON. Si el análisis falla, la línea se trata como texto sin procesar.  
  Por defecto, es **raw**.

## Salida

Cada línea leída desde stdin genera un objeto con el siguiente esquema:
```javascript
{
	id: '<ID de entrada>',
	type: 'stdin',
	originalMessage: '<datos sin procesar u objeto JSON>'
}
```

### Notas:
- El campo `originalMessage` contiene la línea sin procesar o el objeto JSON analizado, dependiendo de la configuración de `format`.
- Si el `format` está configurado como **json** y una línea no se puede analizar como JSON, se devolverá como texto sin procesar.
- Esta entrada es particularmente útil para pruebas o para procesar datos canalizados desde otros comandos o scripts.
