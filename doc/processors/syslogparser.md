## Syslog Parser Processor

The Syslog Parser Processor parses syslog messages into structured objects. It supports both single-threaded and multi-threaded processing for improved performance.

## Examples

### Example 1: Single-threaded parsing
#### Configuration
```json
"processors": {
	"syslogParser": {
		"type": "syslogparser",
		"config": {
			"field": "${originalMessage}"
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app - - - Test message"
}
```

#### Output
```json
{
	"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app - - - Test message",
	"syslog": {
		"priority": 34,
		"version": 1,
		"timestamp": "2023-03-15T10:00:00Z",
		"hostname": "host1",
		"appname": "app",
		"message": "Test message"
	}
}
```

---

### Example 2: Multi-threaded parsing
#### Configuration
```json
"processors": {
	"syslogParser": {
		"type": "syslogparser",
		"config": {
			"field": "${originalMessage}",
			"cores": 4
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app - - - Test message"
}
```

#### Output
```json
{
	"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app - - - Test message",
	"syslog": {
		"priority": 34,
		"version": 1,
		"timestamp": "2023-03-15T10:00:00Z",
		"hostname": "host1",
		"appname": "app",
		"message": "Test message"
	}
}
```

---

### Example 3: Parse syslog line in CEF format
#### Configuration
```json
"processors": {
	"syslogParser": {
		"type": "syslogparser",
		"config": {
			"field": "${originalMessage}"
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "<134><165>1 2023-03-15T10:00:00Z host1 app 1234 ID47 [exampleSDID@32473 iut=\"3\" eventSource=\"Application\" eventID=\"1011\"] BOMAn application event log entryn"
}
```

#### Output
```json
{
  "originalMessage": "CEF:0|JATP|Cortex|3.6.0.1444|email|Phishing|8|externalId=1499 eventId=14058 lastActivityTime=2016-05-03 23:42:54+00 src= dst= src_hostname= dst_hostname= src_username= dst_username= mailto:src_email_id=src@abc.com dst_email_id={mailto:test1@abc.com,mailto:test2@abc.com,mailto:test3@abc.com} startTime=2016- 05-03 23:42:54+00 url=http://greatfilesarey.asia/QA/files_to_pcaps/ 74280968a4917da52b5555351eeda969.bin http://greatfilesarey.asia/QA/ files_to_pcaps/1813791bcecf3a3af699337723a30882.bin fileHash=bce00351cfc559afec5beb90ea387b03788e4af5 fileType=PE32",
  "pri": "",
  "prival": null,
  "type": "CEF",
  "ts": "2025-03-18T18:10:24.036Z",
  "message": "CEF:0|JATP|Cortex|3.6.0.1444|email|Phishing|8|externalId=1499 eventId=14058 lastActivityTime=2016-05-03 23:42:54+00 src= dst= src_hostname= dst_hostname= src_username= dst_username= mailto:src_email_id=src@abc.com dst_email_id={mailto:test1@abc.com,mailto:test2@abc.com,mailto:test3@abc.com} startTime=2016- 05-03 23:42:54+00 url=http://greatfilesarey.asia/QA/files_to_pcaps/ 74280968a4917da52b5555351eeda969.bin http://greatfilesarey.asia/QA/ files_to_pcaps/1813791bcecf3a3af699337723a30882.bin fileHash=bce00351cfc559afec5beb90ea387b03788e4af5 fileType=PE32",
  "chain": [],
  "host": "",
  "cef": {
    "version": "CEF:0",
    "deviceVendor": "JATP",
    "deviceProduct": "Cortex",
    "deviceVersion": "3.6.0.1444",
    "deviceEventClassID": "email",
    "name": "Phishing",
    "severity": "8",
    "extension": "externalId=1499 eventId=14058 lastActivityTime=2016-05-03 23:42:54+00 src= dst= src_hostname= dst_hostname= src_username= dst_username= mailto:src_email_id=src@abc.com dst_email_id={mailto:test1@abc.com,mailto:test2@abc.com,mailto:test3@abc.com} startTime=2016- 05-03 23:42:54+00 url=http://greatfilesarey.asia/QA/files_to_pcaps/ 74280968a4917da52b5555351eeda969.bin http://greatfilesarey.asia/QA/ files_to_pcaps/1813791bcecf3a3af699337723a30882.bin fileHash=bce00351cfc559afec5beb90ea387b03788e4af5 fileType=PE32"
  },
  "fields": {
    "externalId": "1499",
    "eventId": "14058",
    "lastActivityTime": "2016-05-03 23:42:54+00",
    "src": "",
    "dst": "",
    "src_hostname": "",
    "dst_hostname": "",
    "src_username": "",
    "dst_username": "",
    "mailto:src_email_id": "src@abc.com",
    "dst_email_id": "{mailto:test1@abc.com,mailto:test2@abc.com,mailto:test3@abc.com}",
    "startTime": "2016- 05-03 23:42:54+00",
    "url": "http://greatfilesarey.asia/QA/files_to_pcaps/ 74280968a4917da52b5555351eeda969.bin http://greatfilesarey.asia/QA/ files_to_pcaps/1813791bcecf3a3af699337723a30882.bin",
    "fileHash": "bce00351cfc559afec5beb90ea387b03788e4af5",
    "fileType": "PE32"
  },
  "header": ""
}
---

### Example 4: Parse structured syslog
#### Configuration
```json
"processors": {
	"syslogParser": {
		"type": "syslogparser",
		"config": {
			"field": "${originalMessage}"
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "<165>1 2023-03-15T10:00:00Z host1 app 1234 ID47 [exampleSDID@32473 iut=\"3\" eventSource=\"Application\" eventID=\"1011\"] BOMAn application event log entry"
}
```

#### Output
```json
{
	"originalMessage": "<165>1 2023-03-15T10:00:00Z host1 app 1234 ID47 [exampleSDID@32473 iut=\"3\" eventSource=\"Application\" eventID=\"1011\"] BOMAn application event log entry",
	"pri": "<165>",
	"prival": 165,
	"facilityval": 20,
	"levelval": 5,
	"facility": "local4",
	"level": "notice",
	"version": 1,
	"type": "RFC5424",
	"ts": "2023-03-15T10:00:00.000Z",
	"host": "host1",
	"appName": "app",
	"pid": "1234",
	"messageid": "ID47",
	"message": "BOMAn application event log entry",
	"chain": [],
	"structuredData": [
		{
			"$id": "exampleSDID@32473",
			"iut": "3",
			"eventSource": "Application",
			"eventID": "1011"
		}
	],
	"header": "<165>1 2023-03-15T10:00:00Z host1 app 1234 ID47 ",
	"fields": []
}
```

---

## Configuration Parameters
* **field**: The input field containing the syslog message to parse (default: `${originalMessage}`).
* **cores**: The number of cores to use for multi-threaded processing (default: `0`, meaning single-threaded).
* **multithreading**: Automatically enabled if `cores` is greater than `0` and the environment supports worker threads.
