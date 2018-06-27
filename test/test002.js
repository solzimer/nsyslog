const fs = require("fs-extra");

async function generate(lines) {
	let fd = await fs.open('out.txt','w');
	for(let i=0;i<lines;i++) {
		await fs.write(fd,`${i} => This is the line number ${i} of a generated file\n`);
	}
	await fs.close(fd);
}

generate(50000);
