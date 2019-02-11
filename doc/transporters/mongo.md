## MongoDB Transporter

Sends data to a MongoDB Database

## Examples

Sends object to a mongodb database. Also creates indexes.

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

## Configuration parameters
* **url** : MongoDB Endpoint (mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]])
* **collection** : Database collection (allows expression)
* **options** : Options object passed to the [insert mongo operation](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#insertMany)
* **indexes** : Indexes to create on the collection
* **retry** : Retry on error
* **format** : Format expression
