## Procesador de Parser XML

El Procesador de Parser XML analiza mensajes XML en objetos JSON estructurados. Soporta procesamiento en un solo hilo y en múltiples hilos, así como el análisis de XML en varias líneas.

## Ejemplos

### Ejemplo 1: Analizar XML con múltiples hilos
#### Configuración
```json
"processors": {
	"xmlParser": {
		"type": "xmlparser",
		"config": {
			"input": "${originalMessage}",
			"output": "xmlData",
			"cores": 4
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "<root><item>Value1</item><item>Value2</item></root>"
}
```

#### Salida
```json
{
	"originalMessage": "<root><item>Value1</item><item>Value2</item></root>",
	"xmlData": {
		"root": {
			"item": ["Value1", "Value2"]
		}
	}
}
```

---

### Ejemplo 2: Analizar XML en varias líneas
#### Configuración
```json
"processors": {
	"xmlParser": {
		"type": "xmlparser",
		"config": {
			"input": "${originalMessage}",
			"output": "xmlData",
			"multiline": true,
			"tag": "record"
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "<record><field>Value1</field></record><record><field>Value2</field></record>"
}
```

#### Salida
```json
{
	"originalMessage": "<record><field>Value1</field></record><record><field>Value2</field></record>",
	"xmlData": [
		{
			"record": {
				"field": "Value1"
			}
		},
		{
			"record": {
				"field": "Value2"
			}
		}
	]
}
```

---

## Parámetros de Configuración
* **input**: Expresión para extraer el mensaje XML (por defecto: `${originalMessage}`).
* **output**: Campo donde se almacenará el objeto JSON analizado.
* **cores**: Número de hilos a utilizar para el procesamiento en múltiples hilos (por defecto: `0`, lo que significa un solo hilo).
* **multiline**: Indica si los datos XML abarcan varias entradas. Si está habilitado, **tag** es obligatorio.
* **tag**: Etiqueta XML que delimita los datos XML a analizar.
