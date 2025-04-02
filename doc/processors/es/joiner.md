## Procesador Joiner

Une múltiples entradas de registro en una sola cadena.

## Ejemplos
```json
"processors": {
	"joiner": {
		"type": "joiner",
		"config": {
			"input": "${originalMessage}",
			"output": "joinedMessage",
			"delimiter": "\n",
			"max": 1000,
			"wait": 2000
		}
	}
}
```

## Parámetros de configuración
* **input**: Expresión para extraer el campo de entrada (por defecto: `${originalMessage}`).
* **output**: Campo de salida para almacenar la cadena unida.
* **delimiter**: Cadena utilizada para separar las entradas unidas (por defecto: `\n`).
* **max**: Número máximo de entradas a unir (por defecto: 1000).
* **wait**: Tiempo máximo de espera en milisegundos antes de generar la cadena unida (por defecto: 2000 ms).
