## Processors

Processors receive entries and transform them, parsing, setting or deleting properties. They can filter, group, call external scripts, derivate data, and many more.

Processors operate always in serial mode. That is, when multiple processors are present in a flow, they are chained so one entry must pass through all of them (unless it is filtered) until it is sent to the transporters phase.

A processor can ben synchronous or asynchronous. Either way, entries alwais mantain their relative order, and are processed this way.

This is the core set of included processors:

* [Array](array.md)
* [Date format](dateformat.md)
* [CSV output](csvout.md)
* [CSV parser](csvparser.md)
* [Filter](filter.md)
* [Generic parser](parser.md)
* [JSON parser](jsonparser.md)
* [Multilang Protocol](multilang.md)
* [Properties](properties.md)
* [Sequence](sequence.md)
* [Split](split.md)
* [Syslog parser](syslogparser.md)
* [Timestamp](timestamp.md)
* [Translate](translate.md)
* [XML parser](xmlparser.md)

## Configuration
Every processor is configured the same way in the JSON configuration file:

```javascript
"processors" : {
	"parser" : {
		"type" : "csvparser",
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

Let's look at each section of the JSON configuration:
* **ID** : The first key (*parser*) is the ID / Reference of the processor. It can be whatever name you like (following JSON rules), and will be used as a reference in other sections.
* **type** : The type of the processor (as seen before).
* **config** : These are the particular configuration parameters of each processor type.

## Processor Groups
A chain of processors can be grouped under a single ID, so it's easy to reference it, using this single ID instead of the complete list of processor IDs:

```javascript
{
	"processorGroups" : {
		"chain1" : ["procc1","procc2","procc3"]
	},

	"flows" : [
		// Non grouped mode
		{"from":"*", "processors":["procc1","procc2","procc3"]},
		// Grouped modes
		{"from":"*", "processors":"$chain1"},
		{"from":"*", "processors":["$chain1"]},
		// Mixed mode
		{"from":"*", "processors":["$chain1","$chain2","another_procc"]},
	]
}
```

[Back](../README.md)
