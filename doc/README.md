# nsyslog

![Architecture](assets/nsyslog.svg)

## Inputs
* [Syslog UDP, TCP and TLS](inputs/syslog.md)
* [File Watcher](inputs/file.md)

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
