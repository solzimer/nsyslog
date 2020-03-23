const MAX = 10000000;
let map1 = {};
let map2 = new Map();

let t1_1 = Date.now();
for(let i=1;i<=MAX;i++) {
	map1[i] = {key:i};
	if(i%100==0) {
		for(let j=i-100;j<i;j++) {
			delete map1[j]
		}
	}
}
let t1_2 = Date.now();
console.log(`Object: ${t1_2-t1_1} ms`);

let t2_1 = Date.now();
for(let i=1;i<=MAX;i++) {
	map2.set(i,{key:i});
	if(i%100==0) {
		for(let j=i-100;j<i;j++) {
			map2.delete(j);
		}
	}
}
let t2_2 = Date.now();
console.log(`Map: ${t2_2-t2_1} ms`);
