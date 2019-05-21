const
	mingo = require('mingo'),
	jsexpr = require('jsexpr');

const CACHE = {};

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
    },
  };
});

mingo.addOperators(mingo.OP_EXPRESSION, function(_) {
	return {
		$eval(selector, value, args) {
			if(!CACHE[value]) {
				CACHE[value] = jsexpr.eval(value);
			}
			return CACHE[value](selector);
		}
	}
});


module.exports = mingo;
