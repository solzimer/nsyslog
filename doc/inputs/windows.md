## Windows Input

The Windows Input is capable of reading Windows Event Logs and maintaining a watermark for incremental data fetching. It works on Windows 7 and above, as it depends on the `wevtutil` command-line utility.

## Examples

### Example 1: Read from the 'Application' channel with watermark
```json
"inputs": {
	"windows": {
		"type": "windows",
		"config": {
			"readmode": "watermark",
			"offset": "begin",
			"channel": "Application",
			"batchsize": 5000,
			"idfilter": [902, 903]
		}
	}
}
```

### Example 2: Read from the 'Security' channel starting at the latest entry
```json
"inputs": {
	"windows": {
		"type": "windows",
		"config": {
			"readmode": "offset",
			"offset": "end",
			"channel": "Security",
			"batchsize": 1000
		}
	}
}
```

### Example 3: Read from a remote machine's 'System' channel
```json
"inputs": {
	"windows": {
		"type": "windows",
		"config": {
			"readmode": "watermark",
			"offset": "begin",
			"channel": "System",
			"remote": "192.168.1.100",
			"username": "admin",
			"password": "password123",
			"batchsize": 2000
		}
	}
}
```

### Example 4: Filter events by a specific date
```json
"inputs": {
	"windows": {
		"type": "windows",
		"config": {
			"readmode": "offset",
			"offset": "2023-01-01T00:00:00",
			"channel": "Application",
			"batchsize": 1000
		}
	}
}
```

## Configuration Parameters

- **channel**:  
  The name of the Windows Event Log channel to read from (e.g., `Application`, `Security`, `System`).

- **readmode**:  
  Specifies the reading mode.  
  - **offset**: Always starts reading from the specified offset, regardless of process restarts.  
  - **watermark**: Remembers the last read position and continues from there after a restart.

- **offset**:  
  Specifies the starting point for reading events.  
  - Can be one of the following:  
    - **begin** or **start**: Start reading from the oldest entry.  
    - **end**: Start reading from the latest entry.  
    - A specific date in the format `YYYY-MM-DDTHH:mm:ss`.

- **batchsize**:  
  The number of events to read at a time. Defaults to `1000`.

- **interval**:  
  The interval (in milliseconds) to wait when no data is available. Defaults to `500`.

- **idfilter**:  
  An array of event IDs to filter. Only events with these IDs will be read. Optional.

- **remote**:  
  The hostname or IP address of a remote machine to read events from. Optional.

- **username**:  
  The username for accessing the remote machine. Required if `remote` is specified.

- **password**:  
  The password for accessing the remote machine. Required if `remote` is specified.

## Output

Each read operation generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'windows',
	ts: '<Event Timestamp>',
	Event: '<Event JSON Data>'
}
```

### Example Output
```json
{
	"channel": "Application",
	"originalMessage": {
		"xmlns": "http://schemas.microsoft.com/win/2004/08/events/event",
		"System": {
			"Provider": {
				"Name": "MsiInstaller"
			},
			"EventID": {
				"_": "1035",
				"Qualifiers": "0"
			},
			"Level": "4",
			"Task": "0",
			"Keywords": "0x80000000000000",
			"TimeCreated": {
				"SystemTime": "2023-02-09T09:21:32.000000000Z"
			},
			"EventRecordID": "244031",
			"Channel": "Application",
			"Computer": "localhost",
			"Security": {
				"UserID": "S-1-5-18"
			}
		},
		"EventData": {
			"Data": [
				"Microsoft .NET Framework 4.5.1 RC Multi-Targeting Pack for Windows Store Apps (ENU)",
				"4.5.21005",
				"1033",
				"0",
				"Microsoft Corporation",
				"(NULL)",
				""
			],
			"Binary": "7B4132323342"
		},
		"SystemTime": "2023-02-09T09:21:32.000000000Z"
	},
	"input": "windows",
	"type": "windows"
}
```

## Notes

- The `readmode` parameter determines whether the input remembers its position after a restart.
- The `idfilter` parameter can be used to limit the events to specific IDs, reducing unnecessary processing.
- When using the `remote` parameter, ensure that the remote machine is accessible and that the credentials provided have sufficient permissions to read the event logs.
- The `offset` parameter can be used to start reading from a specific date, which is useful for historical data analysis.
