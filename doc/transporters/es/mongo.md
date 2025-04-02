## Transportador MongoDB

Envía datos a una base de datos MongoDB.

## Ejemplos

Envía objetos a una base de datos MongoDB. También crea índices.

```json
"transporters" : {
	"mongo" : {
		"type" : "mongo",
		"config" : {
			"url" : "mongodb://username:password@host1:27017,host2:27017/test",
			"collection" : "mydata",
			"indexes" : [
				{"field1" : 1},
				{"compound1" : 1, "compound2" : 1}
			],
			"retry" : true,
			"options" : {
				"bypassDocumentValidation" : true,
				"ordered" : false
			},
			"format" : {
				"seq" : "${seq}",
				"line" : "${originalMessage}",
				"field1" : "${timestamp}",
				"compound1" : "${severity}",
				"compound2" : "${username}"
			}
		}
	}
}
```

## Parámetros de configuración
* **url** : Punto de conexión de MongoDB (mongodb://[usuario:contraseña@]host1[:puerto1][,host2[:puerto2],...[,hostN[:puertoN]]][/[base_de_datos][?opciones]]).
* **collection** : Colección de la base de datos (admite expresiones).
* **options** : Objeto de opciones pasado a la [operación de inserción de Mongo](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#insertMany).
* **indexes** : Índices a crear en la colección.
* **retry** : Reintentar en caso de error.
* **format** : Expresión de formato.
