## File Input

The File Input allows reading multiple files simultaneously and monitoring files or folders for changes, deletions, or additions. It can also remember the reading offset of each file in case of a process restart.

## Examples

### Multiple files in watch mode
Starts always at the beginning of each file:
```json
"inputs": {
	"file": {
		"type": "file",
		"config": {
			"path": "/var/log/**/*.log",
			"watch": true,
			"readmode": "offset",
			"offset": "start"
		}
	}
}
```

### Multiple files in tail mode
Starts always at the beginning of each file:
```json
"inputs": {
	"file": {
		"type": "file",
		"config": {
			"path": "/var/log/**/*.log",
			"readmode": "offset",
			"offset": "start"
		}
	}
}
```

### Multiple files in watch mode with offset recording
Starts always at the beginning and records offsets for further restarts:
```json
"inputs": {
	"file": {
		"type": "file",
		"config": {
			"path": "/var/log/**/*.log",
			"watch": true,
			"readmode": "watermark",
			"offset": "start"
		}
	}
}
```

## Configuration Parameters

- **path**: Glob expression for monitored files.
- **exclude**: Glob expression for excluded files.
- **watch**: Boolean. If `true`, file changes are tracked via OS events, allowing detection of file changes, deletions, or additions. Otherwise, the input will read new lines at fixed intervals.
- **readmode**: Can be either `offset` or `watermark`. 
  - `offset`: Reads always start at the specified offset, regardless of process restarts.
  - `watermark`: Remembers file offsets, so if the process restarts, it continues reading from the last position.
- **offset**: Can be one of `begin`/`start`, `end`, or an integer pointing to a read offset.
- **encoding**: Defaults to `utf8`.
- **blocksize**: Size (in bytes) of the read buffer.
- **options**: Options for the file monitoring module ([See complete list of options](https://github.com/paulmillr/chokidar)).
  - **usePolling**: (default `false`) Whether to use `fs.watchFile` (backed by polling) or `fs.watch`. If polling leads to high CPU utilization, consider setting this to `false`. It is typically necessary to set this to `true` to successfully watch files over a network or in other non-standard situations. Setting this to `true` explicitly on macOS overrides the `useFsEvents` default. You may also set the `CHOKIDAR_USEPOLLING` environment variable to `true` (1) or `false` (0) to override this option.
  - _Polling-specific settings_ (effective when `usePolling: true`):
    - **interval**: (default `100`) Interval of file system polling, in milliseconds. You may also set the `CHOKIDAR_INTERVAL` environment variable to override this option.

## Output

Each read generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'file',
	path: '<file.path>',
	filename: '<file.filename>',
	ln: '<linenumber>',
	originalMessage: '<read line>'
}
```
