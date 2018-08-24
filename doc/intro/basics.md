# Basics

## What is NSyslog
NSyslog is, in essence, a log agent: That is, a process that reads log lines from sources, applies transformations to them, and sends the resulting data to its destinations.

## What can be done?
Some examples:

* Run a syslog server that listens to UDP/TCP syslog messages and write them to disk
* Read data from a file, parse it, generate events and store them to a database
* Subscribe to message queues and operate over the data
* Read Windows events and publish them to a realtime pub/sub mechanism

There's many more that can be done; it depends on your use case. To achieve this level of functionality, NSyslog core architecture is described as follow:

![Architecture](assets/nsyslog.svg)

There are four basic components that run under NSyslog:

* **inputs**: Inputs are responsible for collecting data. An input can be a file reader, an HTTP server, Syslog server, database connector, etc... Inputs collect data one **entry** (line) at a time, and can be active (pull) or passive (push)
* **processors**: Processors are cappable of operate over each entry, to perform operations and transformations. They can parse raw data, json, csv or syslog data, stablish new and computed properties, filter and group, etc... Some processors can even be multithreaded (Yes, in node!).
* **transporters**: They are the opposite of inputs; They receive the processed entries and send them to their destination endpoints.
* **flows**: A flow describes a path between inputs, processors and transporters, and are responsible of manage all the process as fast as possible, guaranteeing message order and fault tolerance. Additionally, flows can be forked to take advantage of multi-core cpus.
