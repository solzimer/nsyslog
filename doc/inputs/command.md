## Command Input

Fetch data from a shell command execution.

## Examples

List folders every 2 seconds (exec mode):
```json
"inputs" : {
	"list" : {
		"type" : "command",
		"config" : {
			"cmd" : "ls -la",
			"mode" : "exec",
			"interval" : 2000,
			"options" : {				
				"cwd" : "/var/log"
			}
		}
	}
}
```

Monitor a log file (spawn mode):
```json
"inputs" : {
	"monitor" : {
		"type" : "command",
		"config" : {
			"cmd" : "tail",
			"mode" : "spawn",
			"args" : ["-f", "/var/log/syslog"],
			"options" : {				
				"cwd" : "/var/log"
			}
		}
	}
}
```

## Configuration parameters
* **cmd** : Command to execute.
* **mode** : Execution mode. Can be `exec` (default) or `spawn`.
* **interval** : Number of milliseconds to execute the next command. If not specified, this input behaves as a pull input (data will be fetched when the flow requires it). If set, it behaves as a push input (data will be fetched on an interval basis).
* **args** : Array of arguments to pass to the command (used with `spawn` mode).
* **options** : Options passed to the exec or spawn command, as described in the [NodeJS documentation](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback).

## Output
Each exec or spawn call will generate objects with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'command',
	cmd : '<command>',
	stream : '<stdout|stderr|exit>', // Only for spawn mode
	originalMessage : '<raw data>'
}
```
