## Filters

Filters describe expressions that entries must match in order to be sent to their corresponding flows. These expressions are written following the [jsexpr](https://www.npmjs.com/package/jsexpr) expression evaluator.

## Configuration
Filters can be declared in the JSON configuration file, or they can be used inline by the flows:

```javascript
{
	"filters" : {
		"fromUDP" : "${server.protocol}=='udp4'",
		"localhost" : "${client.address}=='127.0.0.1'",
		"interface" : "${client.address}!='127.0.0.1'",
		"httpOk" : "${message}.match(/ 200/)",
		"httpRed" : "${message}.match(/ 302/)",
		"httpErr" : "${message}.match(/ (404|500)/)"
	}

	"filterGroups" : {
		"allcodes" : ["httpOk","httpRed","httpErr"]
	}
}
```

Then, they can be used by the flows:
```javascript
{
	"flows" : [
		{
			"from":"localhost", "when":["httpOk"], "transporters":"log", "mode":"parallel",
			"flows" : [
				// Nested flows, using the same "from" filter, but different "when"
				{"when":["httpOk"], "transporters":"log", "mode":"parallel"},
				{"when":["httpRed"], "transporters":"warn", "mode":"parallel"},
				{"when":["httpErr"], "transporters":"error", "mode":"serial"}
			]
		},
		// Using a filter group
		{"from":["interface","$allcodes"], "processors":["stats"], "transporters":["debug"], "mode":"serial"},

		// Inline filter, doesn't need to be declared
		{"from":"${id}=='glob'", "disabled":false, "transporters":["debug"], "mode":"serial"}
	]
}
```

## Filter Groups
As seen before, you can group filters. The logic behind filter groups is like an "OR" operation. Any matched expression will activate the filter.

[Back](../README.md)
