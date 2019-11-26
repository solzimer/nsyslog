const
	mingo = require('mingo'),
	jsexpr = require('jsexpr');

const EV_CACHE = {};
const EX_CACHE = {};

mingo.addOperators(mingo.OP_QUERY, function(_) {
  return {
    $starts(selector, value, args) {
      return (value||"").startsWith(args[0]);
    },
		$startsWith(selector, value, args) {
      return (value||"").startsWith(args[0]);
    },
		$ends(selector, value, args) {
      return (value||"").endsWith(args[0]);
    },
		$endsWith(selector, value, args) {
      return (value||"").endsWith(args[0]);
    },
		$contains(selector, value, args) {
      return (value||"").indexOf(args[0])>=0;
    }
  };
});

mingo.addOperators(mingo.OP_EXPRESSION, function(_) {
	return {
		$eval(selector, value, args) {
			if(!EV_CACHE[value]) {
				EV_CACHE[value] = jsexpr.eval(value);
			}
			return EV_CACHE[value](selector);
		},
		$expr(selector, value, args) {
			if(!EX_CACHE[value]) {
				EX_CACHE[value] = jsexpr.expr(value);
			}
			return EX_CACHE[value](selector);
		},
		$keyval(selector, value, args) {
			let val = _.computeValue(selector,value);
			return val.reduce((map,item)=>{
				map[item[0]] = item[1] || "_";
				return map;
			},{});
    },
		$trim(selector, value, args) {
			let chars = new Set(value.chars.split(''));
			let val = _.computeValue(selector,value.input).split('');
			while(chars.has(val[0])) val.shift();
			while(chars.has(val[val.length-1])) val.pop();
      return val.join('');
    },
		$starts(selector, value, args) {
			let val = _.computeValue(selector,value[0]);
      return (val||"").startsWith(value[1]);
    },
		$startsWidth(selector, value, args) {
			let val = _.computeValue(selector,value[0]);
      return (val||"").startsWith(value[1]);
    },
		$ends(selector, value, args) {
			let val = _.computeValue(selector,value[0]);
      return (val||"").endsWith(value[1]);
    },
		$endsWith(selector, value, args) {
			let val = _.computeValue(selector,value[0]);
      return (val||"").endsWith(value[1]);
    },
		$contains(selector, value, args) {
			let val = _.computeValue(selector,value[0]);
      return (val||"").indexOf(value[1])>=0;
		}
	}
});


module.exports = mingo;
