## Crypto

Hash, cipher, decipher and public/private encryption of data

## Examples
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

## Configuration parameters
* **input** : Input expression (result must be a string)
* **output** : Output field
* **mode** : Crypto mode:
	* **hash** : Perform message digest
	* **signature** : Signs message with a certificate for posterior verification
	* **verify** : Verify a previously signed message
	* **privateEncrypt** : Encrypt a message with a private key
	* **publicEncrypt** : Encrypt a message with a public key
	* **publicDecrypt** : Descrypts a message with a public certificate (The message has been previously encrypted with *privateEncrypt*)
	* **privateDecrypt** : Decrypts a message with a private key (The message has been previously encrypted with a public certificate)
	* **cipher** : Ciphers a message with a password
	* **decipher** : Deciphers a message with a password
* **algorythm** : Optional. Selects the algorythm to be used for some crypto modes:
	* **hash** : Defaults to sha256. See [list of supported algorythms](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options)
	* **signature** : Defaults to sha256. See [list of supported algorythms](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options)
* **password** : Password for cipher / decipher modes.
* **tls** : Optional, see [Node TLS Options](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options). TLS options for some modes (signature, verify, privateEncrypt, privateDecrypt, publicEncrypt, publicDecrypt). If not provided, the internal private / public keys will be used by these modes.
