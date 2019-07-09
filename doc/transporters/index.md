## Transporters

Transporters are meant to write entries to destination endpoints, such as files, syslog, database, etc..

Since a flow can have more than one transporter, and, since they involve asynchronous I/O, yo can send entries to these transporters in serial or parallel mode. As seen in the processors section, again, entries are written to the transporters always preserving the order.

This is the core set of included transporters:

* [Console](console.md)
* [File](file.md)
* [HTTP](http.md)
* [Kafka](kafka.md)
* [MongoDB](mongo.md)
* [Null](null.md)
* [Redis](redis.md)
* [Reemit](reemit.md)
* [Syslog](syslog.md)
* [ZeroMQ](zmq.md)

## Configuration
Every transporter is configured the same way in the JSON configuration file:

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

Let's look at each section of the JSON configuration:
* **ID** : The first key (*mongo*, *null*) is the ID / Reference of the transporter. It can be whatever name you like (following JSON rules), and will be used as a reference in other sections.
* **type** : The type of the transporter (as seen before).
* **config** : These are the particular configuration parameters of each processor type.
* **when** : Optional. It defines a very first filter for entries.
	* **filter** : Can be an expression or *false*. If an entry match the expression, it will be sent to flows; otherwise the entry is ignored.
	* **match** : Can be *process* (default), *bypass* or *block*. If *process*, when entry match the filter expression, it is processed by the component. On *bypass* mode, the component ignores the entry and sends it to the next component in the flow. if *block*, the entry is completely ignored.
	* **nomatch** : Can be *process*, *bypass* or *block*. Action to perform when the entry doesn't match the filter.

## Serial and Parallel modes
A flow can have multiple transporters, so entries can be written to multiple endpoints. Unlike processors, that must be run in a sequential (serial) order, transporters can be run in serial or parallel order, so you can write simultaneously to all endpoints, or chain them.

```javascript
{
	"flows" : [
		// Serial mode
		{"from":"*", "transporters":["mongo","null"], "mode":"serial"},
		// Parallel
		{"from":"*", "transporters":["mongo","null"], "mode":"parallel"},
		// Mixed mode using transporter groups
		{"from":"*", "transporters":["console","$serial_chain"], "mode":"parallel"},
	]
}
```

## Transporter Groups
A set of transporters can be grouped under a single ID, so it's easy to reference it, using this single ID instead of the complete list of transporter IDs:

```javascript
{
	"transporterGroups" : {
		// Serial mode
		"serial_chain" : {"mode":"serial", "transporters":["file","syslog","http"]},
		// Parallel mode
		"parallel_chain" : {"mode":"parallel", "transporters":["file","syslog","http"]},
		// Nested groups
		"nested_chain" : {"mode":"serial", "transporters":["$serial_chain","$parallel_chain"]},
	}
}
```

[Back](../README.md)
