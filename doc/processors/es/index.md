## Procesadores

Los procesadores reciben entradas y las transforman, analizando, configurando o eliminando propiedades. Pueden filtrar, agrupar, llamar a scripts externos, derivar datos y mucho más.

Los procesadores siempre operan en modo secuencial. Es decir, cuando hay múltiples procesadores en un flujo, se encadenan de manera que una entrada debe pasar por todos ellos (a menos que sea filtrada) hasta que se envíe a la fase de transportadores.

Un procesador puede ser síncrono o asíncrono. En cualquier caso, las entradas siempre mantienen su orden relativo y se procesan de esta manera.

Este es el conjunto principal de procesadores incluidos:

* [Array](array.md)
* [Formato de fecha](dateformat.md)
* [Salida CSV](csvout.md)
* [Analizador CSV](csvparser.md)
* [Filtro](filter.md)
* [Analizador genérico](parser.md)
* [Analizador JSON](jsonparser.md)
* [Analizador KeyValue](keyvalparser.md)
* [Combinar](merge.md)
* [Protocolo Multilenguaje](multilang.md)
* [Propiedades](properties.md)
* [Secuencia](sequence.md)
* [Dividir](split.md)
* [Analizador Syslog](syslogparser.md)
* [Marca de tiempo](timestamp.md)
* [Traducir](translate.md)
* [Analizador XML](xmlparser.md)

## Configuración
Cada procesador se configura de la misma manera en el archivo de configuración JSON:

```javascript
"processors" : {
	"parser" : {
		"type" : "csvparser",
		"when" : {
			"filter" : "${originalMessage}.startsWith('a')",
			"nomatch" : "block"
		},
		"config" : {
			"output" : "csv",
			"cores" : 4,
			"options" : {
				"trim" : true,
				"cast" : true,
				"delimiter" : ",",
				"columns" : [
					"VMail Message","Day Mins","Eve Mins","Night Mins","Intl Mins","CustServ Calls",
					"Day Calls","Day Charge","Eve Calls","Eve Charge","Night Calls","Night Charge",
					"Intl Calls","Intl Charge","Area Code","Phone","Account Length","Int'l Plan",
					"VMail Plan","State"
				]
			}
		}
	}
}
```

Veamos cada sección de la configuración JSON:
* **ID** : La primera clave (*parser*) es el ID / Referencia del procesador. Puede ser cualquier nombre que desees (siguiendo las reglas de JSON) y se usará como referencia en otras secciones.
* **type** : El tipo de procesador (como se vio antes).
* **config** : Estos son los parámetros de configuración particulares de cada tipo de procesador.
* **when** : Opcional. Define un filtro inicial para las entradas.
	* **filter** : Puede ser una expresión o *false*. Si una entrada coincide con la expresión, se enviará a los flujos; de lo contrario, la entrada se ignora.
	* **match** : Puede ser *process* (por defecto), *bypass* o *block*. Si es *process*, cuando la entrada coincide con la expresión del filtro, es procesada por el componente. En modo *bypass*, el componente ignora la entrada y la envía al siguiente componente en el flujo. Si es *block*, la entrada se ignora completamente.
	* **nomatch** : Puede ser *process*, *bypass* o *block*. Acción a realizar cuando la entrada no coincide con el filtro.

## Grupos de Procesadores
Una cadena de procesadores puede agruparse bajo un único ID, lo que facilita referenciarla utilizando este único ID en lugar de la lista completa de IDs de procesadores:

```javascript
{
	"processorGroups" : {
		"chain1" : ["procc1","procc2","procc3"]
	},

	"flows" : [
		// Modo no agrupado
		{"from":"*", "processors":["procc1","procc2","procc3"]},
		// Modos agrupados
		{"from":"*", "processors":"$chain1"},
		{"from":"*", "processors":["$chain1"]},
		// Modo mixto
		{"from":"*", "processors":["$chain1","$chain2","another_procc"]},
	]
}
```

[Volver](../README.md)
