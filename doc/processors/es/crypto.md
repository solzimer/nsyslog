## Crypto

Hash, cifrado, descifrado y encriptación pública/privada de datos.

## Ejemplos
```json
"processors" : {
	"crypto_hash" : {
		"type" : "crypto",
		"config" : {
			"input" : "${originalMessage.message}",
			"output" : "hash",
			"mode" : "hash"
		}
	},
	"crypto_sign" : {
		"type" : "crypto",
		"config" : {
			"input" : "${originalMessage.message}",
			"output" : "signature",
			"mode" : "sign"
		}
	},
	"crypto_verify" : {
		"type" : "crypto",
		"config" : {
			"input" : "${originalMessage.message}",
			"data" : "${signature}",
			"output" : "verify",
			"mode" : "verify"
		}
	},
	"crypto_privenc" : {
		"type" : "crypto",
		"config" : {
			"input" : "${originalMessage.message}",
			"output" : "privenc",
			"mode" : "privateEncrypt"
		}
	},
	"crypto_privenc_custom" : {
		"type" : "crypto",
		"config" : {
			"input" : "${originalMessage.message}",
			"output" : "privenc",
			"mode" : "privateEncrypt",
			"tls" : {
				"key" : "/path/to/my/private.key",
				"passphrase" : "keypassphrase"
			}
		}
	},
	"crypto_pubenc" : {
		"type" : "crypto",
		"config" : {
			"input" : "${originalMessage.message}",
			"output" : "pubenc",
			"mode" : "publicEncrypt"
		}
	},
	"crypto_privdec" : {
		"type" : "crypto",
		"config" : {
			"input" : "${pubenc}",
			"output" : "privdec",
			"mode" : "privateDecrypt"
		}
	},
	"crypto_pubdec" : {
		"type" : "crypto",
		"config" : {
			"input" : "${privenc}",
			"output" : "pubdec",
			"mode" : "publicDecrypt"
		}
	},
	"crypto_pubdec_custom" : {
		"type" : "crypto",
		"config" : {
			"input" : "${privenc}",
			"output" : "pubdec",
			"mode" : "publicDecrypt",
			"tls" : {
				"cert" : "/path/to/my/public.cer"
			}			
		}
	},
	"crypto_cipher" : {
		"type" : "crypto",
		"config" : {
			"input" : "${originalMessage.message}",
			"output" : "cipher",
			"mode" : "cipher"
		}
	},
	"crypto_decipher" : {
		"type" : "crypto",
		"config" : {
			"input" : "${cipher}",
			"output" : "decipher",
			"mode" : "decipher"
		}
	}
}
```

## Parámetros de configuración
* **input** : Expresión de entrada (el resultado debe ser una cadena).
* **output** : Campo de salida.
* **mode** : Modo de criptografía:
	* **hash** : Realiza un resumen de mensaje.
	* **signature** : Firma un mensaje con un certificado para su posterior verificación.
	* **verify** : Verifica un mensaje previamente firmado.
	* **privateEncrypt** : Cifra un mensaje con una clave privada.
	* **publicEncrypt** : Cifra un mensaje con una clave pública.
	* **publicDecrypt** : Descifra un mensaje con un certificado público (El mensaje ha sido previamente cifrado con *privateEncrypt*).
	* **privateDecrypt** : Descifra un mensaje con una clave privada (El mensaje ha sido previamente cifrado con un certificado público).
	* **cipher** : Cifra un mensaje con una contraseña.
	* **decipher** : Descifra un mensaje con una contraseña.
* **algorythm** : Opcional. Selecciona el algoritmo a usar para algunos modos de criptografía:
	* **hash** : Por defecto sha256. Ver [lista de algoritmos soportados](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options).
	* **signature** : Por defecto sha256. Ver [lista de algoritmos soportados](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options).
* **password** : Contraseña para los modos de cifrado/descifrado.
* **tls** : Opcional, ver [Opciones TLS de Node](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options). Opciones TLS para algunos modos (signature, verify, privateEncrypt, privateDecrypt, publicEncrypt, publicDecrypt). Si no se proporciona, se usarán las claves privadas/públicas internas.
