async function crashLoop() {
	let i=0;
	let conn = false;
	while(!conn) {
		conn = await new Promise(ok=>{
			setImmediate(async ()=>{
				await crashLoop();
				ok(false);
			});
		});
	}
}

crashLoop();
