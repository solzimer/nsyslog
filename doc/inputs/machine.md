## Machine Input

The Machine Input collects system statistics such as CPU, memory, disk usage, and network interfaces. It provides real-time updates on machine status.

## Examples

Collect machine statistics every 30 seconds:
```json
"inputs": {
	"machine": {
		"type": "machine",
		"config": {
			"key": "system_stats",
			"interval": 30000
		}
	}
}
```

## Configuration parameters
* **key**: A unique identifier for the collected data. Defaults to `ctx`.
* **interval**: The interval in milliseconds for collecting machine statistics. Defaults to `30000` (30 seconds).

## Output
Each collection generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'machine',
	originalMessage: {
		hostname: '<hostname>',
		platform: '<platform>',
		arch: '<architecture>',
		sysUpTime: <system uptime in seconds>,
		processUpTime: <process uptime in seconds>,
		cpu: [<array of CPU information>],
		env: {<environment variables>},
		ifaces: [
			{
				name: '<interface name>',
				data: [<interface details>]
			}
		],
		disk: [<disk information>],
		os: {
			version: '<OS version>',
			release: '<OS release>'
		},
		cpuLoad: {
			min1: <1-minute load average>,
			min5: <5-minute load average>,
			min15: <15-minute load average>
		},
		memory: {
			total: <total memory in bytes>,
			free: <free memory in bytes>
		}
	}
}
```
