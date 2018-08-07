## File Input

File Input allows the reading of several files simultaneously, as well as file/folder monitoring in order to detect changes in the read files, or deletion and inclusion of new ones.

It also remembers the reading offset of each file in case of process restart.

## Examples

Multiple files in watch mode. Starts always at the begining of each file
```json
"inputs" : {
	"file" : {
		"type" : "file",
		"config" : {
			"path" : "/var/log/**/*.log",
			"watch" : true,
			"readmode" : "offset",
			"offset" : "start"
		}
	}
}
```

Multiple files in tail mode. Starts always at the begining of each file
```json
"inputs" : {
	"file" : {
		"type" : "file",
		"config" : {
			"path" : "/var/log/**/*.log",
			"readmode" : "offset",
			"offset" : "start"
		}
	}
}
```

Multiple files in watch mode. Starts always at the begining and records offsets for further restarts
```json
"inputs" : {
	"file" : {
		"type" : "file",
		"config" : {
			"path" : "/var/log/**/*.log",
			"watch" : true,
			"readmode" : "watermark",
			"offset" : "start"
		}
	}
}
```

## Configuration parameters
* **path** : Glob expression for monitored files.
* **watch** : If **true**, file changes are tracked via OS events, allowing for file change, deletion or addition detection. Otherwise, the input will try to read new lines at fixed intervals.
* **readmode** : Can be either of **offset** or **watermark**. When **offset** is used, reads will starts allways at the specified offset, regardless of process restarts. If **watermark** mode is used, the input will remembers each file offsets, so if the process is restarted, it will continue the reads at the last position they where left.
* **offset** : Can be one of **begin / start**, **end** or an integer pointing to a read offset.
* **encoding** : Defaults to *utf8*
* **blocksize** : Size (in bytes) of read buffer

## Output
Each read will generate an object with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'file',
	path : '<file.path>',
	filename : '<file.filename>',
	ln : '<linenumber>',
	originalMessage : '<read line>'
}
```
