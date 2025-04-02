## Transportador Reemitir

El transportador Reemitir es un caso especial de transportador que redirige una entrada de salida al flujo de entrada nuevamente. Esto es útil si deseas crear un gráfico de flujos.

El transportador Reemitir no necesita ser declarado, ya que es instanciado internamente por NSyslog y se identifica con el token \#.

## Ejemplos

```json
{
	"flows" : [
		{"from":"some_input", "processors":"somework", "transporters":"#"}
	]
}
```
