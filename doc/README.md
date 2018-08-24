# nsyslog
The next generation log agent and syslog server!

![Architecture](assets/nsyslog.svg)

NSyslog is a modern, new generation, log agent and syslog server. It features a modular flow architecture of data collectors (inputs), processors and transporters.

Since all the codebase is written in NodeJS, it has a very small memory footprint and excels at data input/output. It also benefits from the excellent [streams framework](https://nodejs.org/api/stream.html) provided natively by node.

### Main Features
* Small memory footprint
* Flow control of push and pull inputs
* A wide core catalog [inputs](inputs/index.md), [processors](processors/index.md) and [transporters](transporters/index.md)
* Extensible with custom inputs, processors and transporters
* Support for Apache Storm multilang protocol
* Multicore flows for parallel processing

## Quick Start
* [Installation](intro/install.md)
* [Introduction](intro/intro.md)
* [Components](intro/components.md)
* [Inputs](inputs/index.md)
* [Processors](processors/index.md)
* [Transporters](transporters/index.md)

## Configuration File
* [Introduction](config/intro.md)
* [Basic configuration](config/basic.md)
* [Custom components](config/custom.md)

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
