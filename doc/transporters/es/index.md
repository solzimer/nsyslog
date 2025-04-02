## Transportadores

Los transportadores están diseñados para escribir entradas en puntos de destino, como archivos, syslog, bases de datos, etc.

Dado que un flujo puede tener más de un transportador, y dado que implican operaciones de E/S asíncronas, puedes enviar entradas a estos transportadores en modo serial o paralelo. Como se ve en la sección de procesadores, nuevamente, las entradas se escriben en los transportadores siempre preservando el orden.

Este es el conjunto principal de transportadores incluidos:

* [Consola](console.md)
* [Archivo](file.md)
* [HTTP](http.md)
* [Kafka](kafka.md)
* [MongoDB](mongo.md)
* [Nulo](null.md)
* [Redis](redis.md)
* [Reemitir](reemit.md)
* [Syslog](syslog.md)
* [ZeroMQ](zmq.md)

## Configuración
Cada transportador se configura de la misma manera en el archivo de configuración JSON:

```javascript
"transporters" : {
	"mongo" : {
		"type" : "mongo",
		"when" : {
			"filter" : "${write}==true",
			"nomatch" : "block"
		},
		"config" : {
			"url" : "mongodb://localhost:27017/test",
			"retry" : true,
			"format" : {
				"seq" : "${seq}",
				"line" : "${originalMessage}"
			}
		}
	},
	"null" : {
		"type" : "null"
	}
}
```

Veamos cada sección de la configuración JSON:
* **ID** : La primera clave (*mongo*, *null*) es el ID / Referencia del transportador. Puede ser cualquier nombre que desees (siguiendo las reglas de JSON) y se usará como referencia en otras secciones.
* **type** : El tipo de transportador (como se vio antes).
* **config** : Estos son los parámetros de configuración particulares de cada tipo de procesador.
* **when** : Opcional. Define un filtro inicial para las entradas.
	* **filter** : Puede ser una expresión o *false*. Si una entrada coincide con la expresión, se enviará a los flujos; de lo contrario, la entrada se ignora.
	* **match** : Puede ser *process* (por defecto), *bypass* o *block*. Si es *process*, cuando la entrada coincide con la expresión del filtro, es procesada por el componente. En modo *bypass*, el componente ignora la entrada y la envía al siguiente componente en el flujo. Si es *block*, la entrada se ignora completamente.
	* **nomatch** : Puede ser *process*, *bypass* o *block*. Acción a realizar cuando la entrada no coincide con el filtro.

## Modos Serial y Paralelo
Un flujo puede tener múltiples transportadores, por lo que las entradas pueden escribirse en múltiples puntos de destino. A diferencia de los procesadores, que deben ejecutarse en un orden secuencial (serial), los transportadores pueden ejecutarse en orden serial o paralelo, para que puedas escribir simultáneamente en todos los puntos de destino o encadenarlos.

```javascript
{
	"flows" : [
		// Modo serial
		{"from":"*", "transporters":["mongo","null"], "mode":"serial"},
		// Paralelo
		{"from":"*", "transporters":["mongo","null"], "mode":"parallel"},
		// Modo mixto usando grupos de transportadores
		{"from":"*", "transporters":["console","$serial_chain"], "mode":"parallel"},
	]
}
```

## Grupos de Transportadores
Un conjunto de transportadores puede agruparse bajo un único ID, para que sea fácil referenciarlo, utilizando este único ID en lugar de la lista completa de IDs de transportadores:

```javascript
{
	"transporterGroups" : {
		// Modo serial
		"serial_chain" : {"mode":"serial", "transporters":["file","syslog","http"]},
		// Modo paralelo
		"parallel_chain" : {"mode":"parallel", "transporters":["file","syslog","http"]},
		// Grupos anidados
		"nested_chain" : {"mode":"serial", "transporters":["$serial_chain","$parallel_chain"]},
	}
}
```

[Volver](../README.md)
