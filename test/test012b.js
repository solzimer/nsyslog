function timer(time) {
	return new Promise(ok=>setTimeout(ok,time));
}

process.stdin.on('readable', () => {
  let chunk;
  // Use a loop to make sure we read all available data.
  while ((chunk = process.stdin.read()) !== null) {
    process.stdout.write(`data: ${chunk}`);
  }
});

async function run() {
	await timer(1000000);
}

run();
