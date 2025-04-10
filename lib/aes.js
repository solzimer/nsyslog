const	crypto = require('crypto');

const DEF_KEY = 'epdmcep1epdmcep2epdmcep3epdmcep4';
const DEF_IV = "0123456789abcdef";

function encrypt(plainText, key, iv) {
	key = crypto.createHash('sha256').update(key || DEF_KEY).digest(); // 32 bytes	
	iv = Buffer.from(iv||DEF_IV, 'utf8');

	let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
	let cip = cipher.update(plainText, 'utf8', 'base64')
	cip += cipher.final('base64');
	return cip;
}

function decrypt(messagebase64, key, iv) {
	try {
		key = crypto.createHash('sha256').update(key || DEF_KEY).digest(); // 32 bytes	
		iv = Buffer.from(iv||DEF_IV, 'utf8');

		let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
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