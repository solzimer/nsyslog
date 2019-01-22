## Command Input

Fetch data from a shell command execution

## Examples

List folders every 2 seconds
```json
"inputs" : {
	"list" : {
		"type" : "command",
		"config" : {
			"cmd" : "ls -la",
			"interval" : 2000,
			"options" : {				
				"cwd" : "/var/log"
			}
		}
	}
}
```

## Configuration parameters
* **cmd** : Command to execute.
* **interval** : Number of milliseconds to execute next command. Note that if not specified, this input behaves as a pull input (data will be fetched when the flow requires it), and, if set, then will behave as a push input (data will be fetched on an interval basis)
* **options** : Options passed to the exec command, as described [NodeJS documentation](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback)

## Output
Each exec call will generate an objects with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'command',
	cmd : '<command>',
	originalMessage : '<raw data>'
}
```
