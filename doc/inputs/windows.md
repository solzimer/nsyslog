## Windows Input

Windows Input is cappable of reading Windows Events, and mantain a watermark. Only works with Windows 7 and above, as it depends on the *wevtutil* Windows command line executable.

## Examples

Read from 'Application' channel with watermark, starting at the oldest entry:
```json
"inputs" : {
	"windows" : {
		"type" : "windows",
		"config" : {
			"readmode" : "watermark",
			"offset" : "begin",
			"channel" : "Application",
			"batchsize" : 5000
		}
	}
}
```

## Configuration parameters
* **channel** : Event channel.
* **readmode** : Can be either of **offset** or **watermark**. When **offset** is used, reads will starts allways at the specified offset, regardless of process restarts. If **watermark** mode is used, the input will remembers last read offsets, so if the process is restarted, it will continue the reads at the last position they where left.
* **offset** : Can be one of **begin / start**, **end** or a date in *YYYY-MM-DDTHH:mm:ss* format.
* **batchsize** : How many events read at a time.
* **remote** : Remote host/ip address to read events from.
* **username** : Remote host username
* **password** : Remote host password

## Output
Each read will generate an object with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'windows',
	ts : '<Event Timestamp>',
	Event : '<Event JSON Data>'
}
```

## Output Example
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
        "SystemTime": "2018-02-09T09:21:32.000000000Z"
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
    "SystemTime": "2018-02-09T09:21:32.000000000Z"
  },
  "input": "windows",
  "type": "windows"
}
```
