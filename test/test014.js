function fail() {
  throw new Error('Me cagüen la puta');
}

try {
  fail();
}catch(err) {
  let json = JSON.stringify(err);
  let str = err.stack;
  console.log(json,str);
}
