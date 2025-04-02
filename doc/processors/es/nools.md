## Procesador Nools

El Procesador Nools utiliza el motor de reglas [Nools](https://github.com/C2FO/nools) para procesar entradas de registro. Permite definir reglas en un archivo `.nools` para afirmar, modificar y retractar entradas basadas en condiciones complejas.

## Ejemplos

### Ejemplo 1: Procesar entradas de registro usando reglas Nools
#### Configuración
```json
"processors": {
	"noolsProcessor": {
		"type": "nools",
		"config": {
			"path": "./rules/myrules.nools"
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "Este es un mensaje de prueba",
	"level": "info"
}
```

#### Reglas (`myrules.nools`)
```javascript
rule "Log Info Messages"
	when {
		e: Entry e.level == "info";
	}
	then {
		logger.info("Procesando mensaje de información:", e.originalMessage);
		modify(e, function() {
			this.processed = true;
		});
	}
}
```

#### Salida
```json
{
	"originalMessage": "Este es un mensaje de prueba",
	"level": "info",
	"processed": true
}
```

---

## Parámetros de configuración
* **path**: Ruta al archivo `.nools` que contiene las reglas.

---

## Cómo funciona
1. El procesador compila el archivo `.nools` en un motor de reglas.
2. Las entradas de registro se afirman en la sesión de Nools como objetos `Entry`.
3. Las reglas definidas en el archivo `.nools` se evalúan contra las entradas.
4. Se realizan acciones como modificar o retractar entradas basadas en las reglas.
5. El procesador envía las entradas modificadas de vuelta a la tubería de procesamiento.

---

## Notas
- El procesador Nools admite lógica personalizada para afirmar, modificar y retractar entradas.
- Asegúrese de que el archivo `.nools` sea válido y siga la sintaxis de Nools.
