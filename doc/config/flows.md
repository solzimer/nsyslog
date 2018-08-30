## Flows

Flows are the way data is processed by NSyslog. It's the composition of inputs, filters, processors and transporters, in order to collect data from sourcesm transform it, and send it to its destinations.

A flow tipically looks like this:

```javascript
{
	"flows" : [
		{
			// ID is optional, but recomended
			"id" : "myflow",
			// Can be a filter, a input ID or an inline expression
			"from" : "files",
			// Can be a filter or inline expression
			"when" : "${originalMessage}.match(/root/)",
			// Disable flow (false by default)
			"disabled" : false,
			// Processors
			"processors" : ["timestamp","$groupAndFilter"],
			// Transporters
			"transporters" : ["logger","$fileAndMongo"],
			// Transporters mode
			"mode" : "parallel",
			// Forked or in main process (main process by default)
			"forked" : false
		}
	]
}
```

## Configuration
Flows are declared in the JSON configuration file, following this syntax:

* **id** : ID is optional since every flow without one will receive an automatic identifier. But can be useful in case you need to keep track of the flow work.
* **from**: Can be a filter ID, a filter group (preceded by a $), an input ID, or an inline expression. This field describes which entries will be sent to this flow. There are two special filters that can be used:
	* \* : When \* is used, a flow will accept all entries.
	* DEFAULT : Tis a special case where a flow will receive entries that haven't been sent to any other flow.
* **when** : Can be a filter ID, a filter group (preceded by a $), or an inline expression. **when** is meant to be a second filter, useful when nesting flows (see below for nested flows)
* **disabled** : Optional. Can *true* or *false* (*false* by default). This disables a flow (useful for test and debugging purpose).
* **processors** : A list of processor / processor group IDs (preceded by $). This is the list of processor instances that will transform the entries. They are chained in the same order they are declared.
* **transporters** : A list of transporter / transporter group IDs (preceded by $). This is the list of transporter instances that will send the entries to their destinatios. They are chained in the same order they are declared.
* **mode** : Optional. Can be either *serial* or *parallel* (*serial* by default). If there are more than one transporter referenced in the *transporters* section (note that a transporter group is seen as a single transporter by the flow), this field (as seen in the [transporters section](../transporters/index.md)) indicates whether transporters are run in serial or parallel mode.
* **forked** : Optional. Can be *true* or *false*. When a flow is forked, NSyslog spawns a new process where the flow will be executed. This is useful on multicore CPUs, so we can release som workload from the main process and send it to this child process. This way you can take advantage of multicore CPUs. Take in mind, however, these considerations:
	* Inputs are still executed in the main process, so entries must be sent to the child processes via IPC mechanisms. This implies that serialization/deserialization of entries can surpass the benefits of forking the flow.
	* If you plan to reference a processor / transporter in multiple flows (so they can *correlate* entries in some way; collecting stats, execute bussiness rules, etc..) note that a forked process doesn't share any state from its parent process, so, a different process means different processor / transporter instances, that **shares nothing** whith their parent ones.

## Nested flows (flow inheritance)
Nested flows are a way to avoid writing multiple flows in the configuration file that shares many things in common. This way, you write a hierarchical flow tree where children processes inherits the properties of their parent:

```javascript
"flows" : [
	{
		"from":"localhost", "transporters":"log", "mode":"parallel",
		"flows" : [
			{"when":["httpOk"], "transporters":"log"},
			{"when":["httpRed"], "transporters":"warn"},
			{"when":["httpErr"], "transporters":"error"}
		]
	}
]
```

[Back](../README.md)
