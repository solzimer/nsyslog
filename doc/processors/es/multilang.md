## Procesador Multilang

Los procesadores Multilang permiten el uso del protocolo [Apache Storm Multilang](http://storm.apache.org/releases/1.1.2/Multilang-protocol.html) para llamar a componentes externos para el procesamiento de datos (Bolts de Apache Storm).

De esta manera, es posible crear scripts externos en cualquier lenguaje que procesen los datos de forma asíncrona, paralela y/o multinúcleo.

## Ejemplos
Uso de un script externo escrito en NodeJS. Se generarán 4 procesos que procesan datos de forma round-robin (shuffle).
```json
"processors" : {
	"tokenize" : {
		"type" : "multilang",
		"config" : {
			"path" : "node multilang/js/tokenize.js",
			"cores" : 4,
			"wire" : "shuffle",
			"module" : false,
			"input" : "${tuple}",
			"output" : "tuple",
			"options" : {
				"max" : 10
			}
		}
	}
}
```

Uso de un script de módulo escrito en NodeJS. Se generarán 2 procesos que procesan datos agrupados por la propiedad *filename*.
```json
"processors" : {
	"tokenize" : {
		"type" : "multilang",
		"config" : {
			"path" : "multilang/js/tokenize.js",
			"cores" : 2,
			"wire" : "group",
			"module" : false,
			"input" : "${tuple}",
			"output" : "tuple",
			"field" : "${filename}",			
			"options" : {
				"max" : 10
			}
		}
	}
}
```

## Parámetros de configuración
* **path** : Línea de comando del proceso a ejecutar, o ruta del archivo si se utiliza el modo *module*.
* **cores** : Número de instancias paralelas que se ejecutarán.
* **wire** : Puede ser *shuffle* o *group*. Cuando se usa *shuffle*, cada objeto de datos se enviará aleatoriamente a una de las instancias del proceso. Alternativamente, cuando se usa *group*, todos los objetos con el mismo valor de *field* se enviarán a la misma instancia del proceso.
* **module** : Solo disponible si el script está escrito en NodeJS y exporta un componente Bolt. Cuando es *true*, el parámetro *path* solo especifica la ruta del script y, en lugar de generar nuevos procesos, se crean múltiples instancias del bolt en el proceso principal.
* **input** : Expresión utilizada para acceder a un array de tuplas en los datos de entrada. Los datos de entrada para los componentes multilang deben ser un array plano de valores.
* **output** : Campo de salida para el componente multilang.
* **field** : Expresión utilizada cuando se usa el modo *group*.
* **options** : Objeto JSON pasado para configurar el componente multilang.

## Ejemplos de componentes Multilang:

```javascript
const {BasicBolt} = require('./storm');

class SplitBolt extends BasicBolt {
	constructor() {
		super();
	}

	initialize(conf, context, callback) {
		// Configuración recibida desde el archivo de configuración
		this.max = conf.max;
		callback();
	}

	process(tup, done) {
		// Dividir el primer valor de la tupla
		var words = tup.values[0].split(" ").splice(0,this.max);

		// Por cada palabra dividida, emitir una nueva tupla
		words.forEach((word) => {
			this.emit(
				{tuple: [word], anchorTupleId: tup.id},
				(taskIds)=> {
					this.log(word + ' enviado a los IDs de tarea - ' + taskIds);
      	}
			);
		});

		// Confirmar la tupla sin errores
		done();
	}
}

// Exportar módulo para que pueda ser usado internamente sin necesidad de
// generar un nuevo proceso
if(module.parent) {
	module.exports = SplitBolt;
}
else {
	new SplitBolt().run();
}
```

```python
import storm

class SplitSentenceBolt(storm.BasicBolt):
    def process(self, tup):
        words = tup.values[0].split(" ")
        for word in words:
          storm.emit([word])

SplitSentenceBolt().run()
```

Puedes ver más ejemplos en [github](https://github.com/solzimer/nsyslog/tree/master/multilang)
