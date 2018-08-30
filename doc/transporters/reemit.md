## Reemit Transporter

Reemit transporter is a special case of transporter that redirects an output entry to the flows input again, This is useful if you want to create a graph of flows.

Reemit transporter desn't need to be declared, as it is internally instantiated by NSyslog, and identified by the \# token.

## Examples

```json
{
	"flows" : [
		{"from":"some_input", "processors":"somework", "transporters":"#"}
	]
}
```
