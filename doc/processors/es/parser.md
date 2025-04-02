## Parser Genérico

El Parser Genérico procesa entradas de registro utilizando un conjunto de reglas JSON basado en una máquina de estados para extraer datos estructurados de mensajes de texto. Los conjuntos de reglas se basan en [Ace Editor Syntax Highlighters](https://ace.c9.io/#nav=higlighter), que derivan de las gramáticas de TextMate.

## Sintaxis del Conjunto de Reglas

Los conjuntos de reglas son archivos JSON o configuraciones en línea que describen una máquina de estados para procesar texto línea por línea (o a través de múltiples líneas). Cada estado define un conjunto de reglas con expresiones regulares para coincidir con tokens y asignarlos a campos en la entrada del registro.

### Elementos Clave de un Conjunto de Reglas (Modo archivo)
- **start**: El estado inicial del parser.
- **regex**: Una expresión regular para coincidir con texto.
- **name**: El/los campo(s) al que se asignará(n) el/los valor(es) coincidente(s).
- **next**: El siguiente estado al que se transicionará después de una coincidencia.
- **set**: Pares clave-valor para asignar campos adicionales o modificar la entrada.
- **reject**: Si es `true`, la entrada será rechazada cuando esta regla coincida.

### Elementos Clave de un Conjunto de Reglas (Modo en línea)
El modo en línea permite definir el conjunto de reglas directamente dentro de la configuración utilizando la propiedad **sm**. Cada regla especifica los siguientes elementos:

- **src**: El estado actual del parser. Es donde comienza la regla.
- **dst**: El siguiente estado al que se transicionará después de una coincidencia. Si no se especifica, el parser permanece en el estado actual.
- **re**: Una expresión regular para coincidir con texto en la entrada. Los grupos de captura nombrados en la expresión regular se utilizan para extraer valores.
- **reject**: (Opcional) Si es `true`, la entrada será rechazada cuando esta regla coincida. Por defecto es `false`.

#### Ejemplo
```json
"sm": [
	{"src": "start", "dst": "data", "re": "(?<timestamp>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+\\d{2}:\\d{2}) (?<res>[\\S]+)"},
	{"src": "data", "dst": "message", "re": "- - -\\s+(?<pid>\\d+) (\\S+): From (?<srcip>[^:]+):(?<srcport>\\d+)\\((?<shn>([^\\)]+))\\) to (?<dstip>[^:]+):(?<dstport>\\d+)\\((?<dhn>[^\\)]+)\\),\\s+"},
	{"src": "message", "re": "(?<message>.*$)"}
]
```

En este ejemplo:
- La primera regla coincide con la marca de tiempo y el recurso en la entrada y transiciona del estado `start` al estado `data`.
- La segunda regla extrae campos adicionales como `pid`, `srcip`, `srcport`, etc., y transiciona al estado `message`.
- La regla final captura el contenido restante del mensaje.

---

## Ejemplos

### Ejemplo 1: Parseo de mensajes syslog
#### Configuración
```json
"processors": {
	"parselog": {
		"type": "parser",
		"config": {
			"path": "./rules/syslogparser.json",
			"map": true,
			"input": "${originalMessage}",
			"output": "parsedData"
		}
	}
}
```

#### Entrada
```json
[
	{
		"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app 1234 - - User user@domain login=success"
	},
	{
		"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app 1234 - - Error 500: internal server error"
	}
]
```

#### Conjunto de Reglas (`syslogparser.json`)
```json
{
	"start": [
		{
			"description": "Parsear encabezado syslog",
			"regex": "<(\\d+)>\\d (\\S+) (\\S+) (\\S+) (\\d+) ",
			"name": ["priority", "timestamp", "hostname", "appname", "pid"],
			"next": "data"
		}
	],
	"data": [
		{
			"description": "Parsear datos hasta el mensaje",
			"regex": "- - ",
			"name": [],
			"next": "message"
		}
	],
	"message": [
		{
			"description": "Parsear mensajes de inicio de sesión",
			"regex": "User ([^ ]+) login=([^ ]+)",
			"name": ["user","result"],
			"next": "end",
			"set": [
				{ "key": "dun", "value" : "${user}"},
				{ "key": "severity", "value": "${result=='success'? 1 : 5}"},
				{ "key": "status", "value": "processed" }
			]
		},
		{
			"description": "Parsear mensajes de error",
			"regex": "Error (\\d+): (.*)",
			"name": ["code","description"],
			"next": "end",
			"set": [
				{ "key": "http", "value" : "${code}"},
				{ "key": "body", "value" : "Error: CODE=${code}, DESCRIPTION=${description}"},
				{ "key": "severity", "value": "4"},
				{ "key": "status", "value": "processed" }
			]
		}
	],
	"end": [
		{
			"description": "Estado final",
			"regex": ".*$"
		}
	]
}
```

#### Salida
```json
[
	{
		"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app 1234 - - User user@domain login=success",
		"parsedData": {
			"priority": "34",
			"timestamp": "2023-03-15T10:00:00Z",
			"hostname": "host1",
			"appname": "app",
			"pid": "1234",
			"dun" : "user@domain",
			"severity" : 1,
			"status": "processed"
		}
	},
	
	{
		"originalMessage": "<34>1 2023-03-15T10:00:00Z host1 app 1234 - - Error 500: internal server error",
		"parsedData": {
			"priority": "34",
			"timestamp": "2023-03-15T10:00:00Z",
			"hostname": "host1",
			"appname": "app",
			"pid": "1234",
			"http" : 500,
			"body" : "Error: CODE=500, DESCRIPTION=Internal server error",
			"severity" : 4,
			"status": "processed"
		}
	}
]
```

### Ejemplo 2: Parseo de mensajes de registro de amenazas
#### Configuración
```json
"processors": {
	"parse": {
		"type": "parser",
		"config": {
			"sm": [
				{"src": "start", "dst": "data", "re": "(?<timestamp>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+\\d{2}:\\d{2}) (?<res>[\\S]+)"},
				{"src": "data", "dst": "message", "re": "- - -\\s+(?<pid>\\d+) (\\S+): From (?<srcip>[^:]+):(?<srcport>\\d+)\\((?<shn>([^\\)]+))\\) to (?<dstip>[^:]+):(?<dstport>\\d+)\\((?<dhn>[^\\)]+)\\),\\s+"},
				{"src": "message", "re": "(?<message>.*$)"}
			],
			"input": "${originalMessage}",
			"output": "event"
		}
	}
}
```

#### Entrada
```json
[
	{
		"originalMessage": "<188>0 2019-11-13T01:03:54+01:00 172.26.200.6 2812027172003338(root) - - -  46809403 Threat@FLOW: From 45.227.254.30:59674(aggregate1.21) to 79.170.8.238:135(-), threat name: Blacklist-IP, threat type: Attack, threat subtype: Risk IP, App/Protocol: IPv4/TCP, action: DROP, defender: PTF, severity: Low, detected low reputation ip: 45.227.254.30, category: Scanner, reputation score 100, hit-count: 1(in the last 5 seconds)"
	}
]
```

#### Salida
```json
[
	{
		"originalMessage": "<188>0 2019-11-13T01:03:54+01:00 172.26.200.6 2812027172003338(root) - - -  46809403 Threat@FLOW: From 45.227.254.30:59674(aggregate1.21) to 79.170.8.238:135(-), threat name: Blacklist-IP, threat type: Attack, threat subtype: Risk IP, App/Protocol: IPv4/TCP, action: DROP, defender: PTF, severity: Low, detected low reputation ip: 45.227.254.30, category: Scanner, reputation score 100, hit-count: 1(in the last 5 seconds)",
		"event": {
			"timestamp": "2019-11-13T01:03:54+01:00",
			"res": "172.26.200.6",
			"pid": "2812027172003338",
			"srcip": "45.227.254.30",
			"srcport": "59674",
			"shn": "aggregate1.21",
			"dstip": "79.170.8.238",
			"dstport": "135",
			"dhn": "-",
			"message": "46809403 Threat@FLOW: From 45.227.254.30:59674(aggregate1.21) to 79.170.8.238:135(-), threat name: Blacklist-IP, threat type: Attack, threat subtype: Risk IP, App/Protocol: IPv4/TCP, action: DROP, defender: PTF, severity: Low, detected low reputation ip: 45.227.254.30, category: Scanner, reputation score 100, hit-count: 1(in the last 5 seconds)"
		}
	}
]
```

---

## Parámetros de Configuración
* **path**: Ruta al archivo del parser. Esta propiedad se utiliza para cargar un conjunto de reglas desde un archivo JSON externo. No puede usarse junto con la propiedad **sm**.
* **sm**: Conjunto de reglas en línea basado en máquina de estados. Esta propiedad permite definir el conjunto de reglas directamente dentro de la configuración como un array de transiciones de estado. Cuando se utiliza esta propiedad, no se debe especificar la propiedad **path**.
* **cores**: Número de instancias paralelas a ejecutar (si es compatible con Node.js).
* **map**: Si es `true`, los datos analizados se almacenarán como un objeto mapa. De lo contrario, será un array.
* **singleval**: Si es `true`, solo se tomará el primer valor de cada nombre cuando existan múltiples valores.
* **input**: Expresión de entrada a analizar.
* **output**: Campo de salida para almacenar los datos analizados.
* **trim**: Si es `true`, recorta el mensaje de entrada antes de analizarlo (por defecto: `true`).
* **extend**: Si es `true`, extiende el objeto de entrada con las propiedades generadas. De lo contrario, lo reemplaza con un nuevo objeto que contiene solo las propiedades generadas (por defecto: `false`).
* **deep**: Si es `true` y **extend** está habilitado, fusiona las propiedades generadas en los campos existentes. De lo contrario, reemplaza el campo de destino (por defecto: `false`).

---

## Notas
- Las reglas se evalúan en orden, y se aplica la primera regla coincidente.
- Utiliza la propiedad `set` para asignar campos adicionales o modificar la entrada dinámicamente.
- Asegúrate de que el archivo JSON del conjunto de reglas sea válido y siga la sintaxis requerida.
- La propiedad **sm** es útil para definir conjuntos de reglas en línea directamente en la configuración, mientras que la propiedad **path** se utiliza para archivos de conjuntos de reglas externos. Estas dos propiedades son mutuamente excluyentes y no pueden usarse juntas.
