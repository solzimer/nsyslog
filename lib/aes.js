const	crypto = require('crypto');

const DEF_KEY = 'epdmcep1epdmcep2';
const DEF_IV = "0123456789abcdef";

function encrypt(plainText, key, iv) {
	key = Buffer.from(key||DEF_KEY);
	iv = Buffer.from(iv||DEF_IV);

	let cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
	let cip = cipher.update(plainText, 'utf8', 'base64')
	cip += cipher.final('base64');
	return cip;
}

function decrypt(messagebase64, key, iv) {
	try {
		key = Buffer.from(key||DEF_KEY);
		iv = Buffer.from(iv||DEF_IV);

		let decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
		let dec = decipher.update(messagebase64, 'base64');
		dec += decipher.final();
		return dec;
	}catch(err) {
		return messagebase64;
	}
}

if(module.parent) {
	module.exports = {
		encrypt, decrypt
	}
}
else {
	let plainText = process.argv[2] || '$u1te1(@MonICA';
	let encrypted = encrypt(plainText);
	console.log(plainText, encrypted);
}