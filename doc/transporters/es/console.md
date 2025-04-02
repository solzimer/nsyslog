## Transportador de Consola

Envía datos a la salida estándar. Soporta coloreado por nivel.

## Ejemplos

Envía el mensaje como registros de depuración:

```json
"transporters" : {
	"log" : {
		"type" : "console",
		"config" : {
			"format" : "${timestamp} => ${originalMessage}",
			"level" : "log"
		}
	}
}
```

## Parámetros de configuración
* **format** : Expresión de salida del mensaje enviado.
* **json** : Opciones de salida JSON:
	* format : true / false.
	* spaces : Indentación JSON.
	* color : true / false. Colorea el JSON (si es true, *level* se ignora).
* **level** : Nivel de salida (soporta expresiones). Puede ser uno de:
	* info : Nivel informativo.
	* debug : Nivel de depuración.
	* log : Nivel de registro.
	* warn : Nivel de advertencia.
	* error : Nivel de error.
