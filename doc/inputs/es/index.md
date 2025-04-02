## Entradas

Las entradas son responsables de leer datos de las fuentes y enviarlos a los flujos para ser procesados.

Una entrada puede ser cualquier mecanismo que permita leer datos de cualquier fuente, como un archivo de texto, base de datos, cola de mensajes, servidor TCP/UDP, etc.

Existen dos tipos de entradas:

* **Entradas Pull**: Las entradas pull leen datos de manera activa. Esto significa que, cuando se solicita, las entradas pull obtendrán una línea de datos, la transformarán en una entrada y la enviarán a los flujos. Luego, esperarán la siguiente solicitud. De esta manera, el proceso de NSyslog no se desbordará, ya que los datos solo se transmiten y procesan según sea necesario, de manera controlada. Ejemplos de entradas pull son: Lectores de archivos, lectores de bases de datos...

* **Entradas Push**: Las entradas push escuchan datos de las fuentes. Tan pronto como una fuente envía datos a la entrada, estos se transforman en una entrada y se envían a los flujos. Las entradas push no pueden controlar cuándo llegan los datos, y si hay más datos de los que NSyslog puede manejar a la vez, el proceso puede desbordarse. Para resolver este problema, las entradas provenientes de entradas push se almacenan en un búfer en disco, y los flujos las solicitan desde allí. Ejemplos de entradas push son: Servidores HTTP, servidores WebSocket, Redis pub/sub...

Este es el conjunto principal de entradas incluidas:

* [Entrada estándar](stdin.md)
* [Observador de archivos](file.md)
* [Cliente HTTP](http.md)
* [Servidor HTTP](httpserver.md)
* [Syslog UDP, TCP y TLS](syslog.md)
* [Apache Kafka](kafka.md)
* [Redis](redis.md)
* [Servidor WebSocket](ws.md)
* [ZeroMQ](zmq.md)
* [Eventos de Windows](windows.md)

## Configuración
Cada entrada se configura de la misma manera en el archivo de configuración JSON:

```javascript
{
	// Sección de entradas
	"inputs" : {
		"logfiles" : {
			"type" : "file",
			"maxPending" : 1000,
			"when" : {
				"filter": "${originalMessage}.startsWith('root')",
				"match" : "bypass",
				"nomatch" : "process"
			},
			"config" : {
				"path" : "/var/log/**/*.log",
				"watch" : true,
				"readmode" : "offset",
				"offset" : "start"				
			}
		}
	}
}
```

Veamos cada sección de la configuración JSON:
* **ID**: La primera clave (*logfiles*) es el ID / Referencia de la entrada. Puede ser cualquier nombre que desees (siguiendo las reglas de JSON) y se usará como referencia en otras secciones.
* **type**: El tipo de la entrada (como se vio anteriormente).
* **maxPending**: Este parámetro es opcional y limitará cuántas entradas una entrada enviará a los flujos antes de que se procesen completamente.
* **when**: Opcional. Define un filtro inicial para las entradas.
	* **filter**: Puede ser una expresión o *false*. Si una entrada coincide con la expresión, se enviará a los flujos; de lo contrario, la entrada se ignora.
	* **match**: Puede ser *process* (por defecto), *bypass* o *block*. Si es *process*, cuando la entrada coincide con la expresión del filtro, es procesada por el componente. En modo *bypass*, el componente ignora la entrada y la envía al siguiente componente en el flujo. Si es *block*, la entrada se ignora completamente.
	* **nomatch**: Puede ser *process*, *bypass* o *block*. Acción a realizar cuando la entrada no coincide con el filtro.
* **config**: Estos son los parámetros de configuración particulares de cada tipo de entrada.

Cada entrada generada por una entrada es un objeto JSON y tendrá, al menos, los siguientes atributos:
```json
{
	"input" : "ID de la entrada",
	"type" : "Tipo de entrada"
}
```

[Volver](../README.md)
