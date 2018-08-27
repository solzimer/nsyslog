# nsyslog
The next generation log agent and syslog server!

![Architecture](assets/nsyslog.svg)

NSyslog is a modern, new generation, log agent and syslog server. It features a modular flow architecture of data collectors (inputs), processors and transporters.

Since all the codebase is written in NodeJS, it has a very small memory footprint and excels at data input/output. It also benefits from the excellent [streams framework](https://nodejs.org/api/stream.html) provided natively by node.

### Main Features
* Small memory footprint
* Flow control of push and pull inputs
* On-Disk input data buffering
* A wide core catalog [inputs](inputs/index.md), [processors](processors/index.md) and [transporters](transporters/index.md)
* Extensible with custom inputs, processors and transporters
* Support for Apache Storm multilang protocol
* Multicore flows for parallel processing

## Quick Start
* [Installation](intro/install.md)
* [Basics](intro/basics.md)

## Configuration File
* [Introduction](config/index.md)
* [Global configurations](config/globals.md)
* [Inputs](inputs/index.md)
* [Filters and Filter Groups](config/filters.md)
* [Processors and Processor Groups](processors/index.md)
* [Transporters and Transporter Groups](transporters/index.md)
* [Flows](config/flows.md)
* [Custom components](config/custom.md)

## API
* [NSyslog](api/nsyslog.md)
* [Input](api/input.md)
* [Processor](api/processor.md)
* [Transporter](api/transporter.md)

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
