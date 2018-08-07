# nsyslog

![Architecture](assets/nsyslog.svg)

## Inputs
* [Standard Input](inputs/stdin.md)
* [File Watcher](inputs/file.md)
* [Syslog UDP, TCP and TLS](inputs/syslog.md)
* [Apache Kafka](inputs/kafka.md)
* [WebSocket Server](inputs/ws.md)
* [ZeroMQ](inputs/zmq.md)
* [Windows Events](inputs/windows.md)

## Processors
* [Timestamp](processors/timestamp.md)
* [Sequence](processors/sequence.md)
* [Properties](processors/properties.md)
* [Syslog Parser](processors/syslogparser.md)
* [Apache Storm Multilang](processors/multilang.md)

## Transporters
* [Null](transporters/null.md)
* [Console](transporters/console.md)
* [File](transporters/file.md)
* [MongoDB](transporters/mongodb.md)
* [Stat](transporters/stat.md)
* [Reemit](transporters/reemit.md)
