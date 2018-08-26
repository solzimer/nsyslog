# Global configurations

Global configurations affect the way NSyslog runs and process data. The currently available configurations are:

```javascript
{
	"config" : {
		"datadir" : "/tmp/nsyslog",
		"input" : {"maxPending" : 1000},
		"buffer" : {"maxPending": 1000},
		"processor" : {"maxPending": 1000},
		"transporter" : {"maxPending": 1000}
	}
}
```

* **datadir** : Folder where NSyslog will store buffers and watermarks. Keep in mind that if you run more than one NSylog process, they cannot share the same folder.
* **input** : Global parameters that affect to all inputs.
	* **maxPending** : Number of entries that will be read from inputs until they are processed.
* **buffer** : Global parameters that affect to all disk buffers.
	* **maxPending** : Number of entries that will be read from buffers until they are processed.
* **processor** : Global parameters that affect to all processors.
	* **maxPending** : Number of entries that will be sent to processors until they are processed.
* **transporter** : Global parameters that affect to all transporters.
	* **maxPending** : Number of entries that will be sent to transporters until they are processed.

[Back](../README.md)
