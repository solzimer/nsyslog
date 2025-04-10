# HIDS Configuration

The `config.collector` section in the configuration file enables the Host-based Intrusion Detection System (HIDS). This feature collects statistics and data about the machine where the process is running.

## Configuration Parameters

### `config.collector.enabled`
- **Description**: Enables or disables the HIDS feature.
- **Type**: Boolean
- **Default**: `true`

### `config.collector.key`
- **Description**: A unique key used to identify the collected data in shared memory.
- **Default**: `"ctx"`

### `config.collector.ival`
- **Description**: The interval (in milliseconds) at which the machine statistics are collected.
- **Default**: `30000` (30 seconds)

## Example Configuration

```json
"collector": {
	"enabled": true,
	"key": "ctx",
	"ival": 1000
}
```

In this example:
- The HIDS feature is enabled.
- The key is set to `"ctx"`.
- The statistics are collected every 1000 milliseconds (1 second).

## Collected Data

The HIDS collects the following machine statistics:
- Hostname
- Platform and architecture
- System uptime and process uptime
- CPU information and load averages
- Memory usage (total and free)
- Disk information
- Network interfaces
- OS version and release
- Environment variables
- IP address of the machine

This data is stored in shared memory and can be used for monitoring or further processing.

```json
{
    "hostname": "logica5",
    "platform": "linux",
    "arch": "x64",
    "sysUpTime": 1213059.62,
    "processUpTime": 16.725374516,
    "cpu": [
        {
            "model": "Intel(R) Xeon(R) Gold 6354 CPU @ 3.00GHz",
            "speed": 2999,
            "times": {
                "user": 93096900,
                "nice": 13840,
                "sys": 64247780,
                "idle": 980116710,
                "irq": 44079170
            },
            ...
        }
    ],
    "env": {
        "_": "./logagent",
        "HISTSIZE": "1000",
        "PATH": ":/usr/bin:/bin:/sbin:/usr/sbin:/mnt/sysimage/bin:/mnt/sysimage/usr/bin:/mnt/sysimage/usr/sbin:/mnt/sysimage/sbin:/sbin:/usr/sbin:/ica/common/node/bin:/usr/local/bin:/root/bin",
        "LOGNAME": "",
        "SHLVL": "1",
        "TMOUT": "600",
        "TERM": "xterm",
        "SHELL": "/bin/bash",
        "MAIL": "/var/spool/mail/",
        "HOME": "/root",
        "PWD": "/ica/monitor1.0",
        "USER": "root",
        "NODE_PATH": "/ica/common/node",
        "OLDPWD": "/root",
        "NODE_OPTIONS": "--max_old_space_size=491",
        "HOSTNAME": "logica5",
        "HISTTIMEFORMAT": "%F %T ",
        "HISTCONTROL": "ignoredups",
        "LANG": "es_ES.UTF-8"
    },
    "ifaces": [
        {
            "name": "lo",
            "data": [
                {
                    "address": "127.0.0.1",
                    "netmask": "255.0.0.0",
                    "family": "IPv4",
                    "mac": "00:00:00:00:00:00",
                    "internal": true,
                    "cidr": "127.0.0.1/8"
                }
            ]
        },
        {
            "name": "ens192",
            "data": [
                {
                    "address": "10.100.200.100",
                    "netmask": "255.255.255.0",
                    "family": "IPv4",
                    "mac": "00:0c:29:9f:54:e5",
                    "internal": false,
                    "cidr": "10.100.200.100/24"
                }
            ]
        }
    ],
    "disk": [
        {
            "_filesystem": "devtmpfs",
            "_blocks": 32690480,
            "_used": 0,
            "_available": 32690480,
            "_capacity": "0%",
            "_mounted": "/dev"
        },
        ...
        {
            "_filesystem": "tmpfs",
            "_blocks": 6542080,
            "_used": 0,
            "_available": 6542080,
            "_capacity": "0%",
            "_mounted": "/run/user/1001"
        }
    ],
    "os": {
        "version": "#1 SMP Tue May 16 11:38:37 UTC 2023",
        "release": "4.18.0-477.10.1.el8_8.x86_64"
    },
    "cpuLoad": {
        "min1": 10.41,
        "min5": 6.32,
        "min15": 5.09
    },
    "memory": {
        "total": 66990931968,
        "free": 50383810560
    }
}
```

## Data usage

HIDS data, as being stored in shared memory, can be accessed by a expression, using "_" as the root path:

```json
{
	"collect" : {
		"type" : "properties",
		"config" : {
			"set" : {
				"cpuCores" : "${_.ctx.cpu.length}",
				"freeMem" : "${_.ctx.memory.free}"
			}
		}
	}
}
```
