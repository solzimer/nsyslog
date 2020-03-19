const
	extend = require("extend"),
	jsexpr = require('jsexpr');

const START = "start";
const IGNORE = {
	"text" : true,
	"void" : true,
	"" : true
};

function toRuleSet(rules) {
	if(Array.isArray(rules)) {
		rules = {start : rules};
	}
	else if(!rules.start) {
		rules = extend({},rules,{start:[]});
	}

	Object.keys(rules).forEach(state=>{
		rules[state].forEach(rule=>{
			try {
				rule.rx = new RegExp(rule.regex || rule.regex);
			}catch(err) {
				this.rx = /^$/;
			}
		});
	});

	return rules;
}

class StateMachine {

	constructor(rules, multi, emptyfield) {
		this.rules = toRuleSet(rules);
		this.state = START;
		this.multi = multi || false;
		this.empty = jsexpr.expr(emptyfield || '${__}');

		// Set value expressions
		Object.keys(this.rules).forEach(k=>{
			let state = this.rules[k];
			state.forEach(rule=>{
				if(rule.set && rule.set.length) {
					rule.set.forEach(s=>{
						s.key = jsexpr.expr(s.key);
						s.value = jsexpr.expr(s.value);
					});
				}
			});
		});
	}

	parse(line) {
		let results = [];
		let obj = {_:line,__:line};

		while(true) {
			let state = this.rules[this.state] || this.rules[START];
			let match = null, rule = null;

			if(!line) return results;

			for(let i=0;i<state.length;i++) {
				let r = state[i];
				match = r.rx.exec(line);
				rule = r;
				if(match != null) break;
			}

			if(!match && this.state!=START) {
				this.state = START;
			}
			else if(!match && this.state==START) {
				let ret = [], k=0, rlen = results.length;
				for(let i=0;i<rlen;i++) {
					let r = results[i];
					if(!IGNORE[r.name])	ret[k++] = r;
				}
				return ret;
			}
			else {
				if(rule.reject) return null;

				line = obj.__ = line.substring(match.index+match[0].length);
				this.state = rule.next || this.state;
				if(!rule.name || !rule.name.length) {
					//continue;
				}
				else {
					let names = Array.isArray(rule.name)? rule.name : [rule.name];
					let nlen = names.length;
					for(let i=0;i<nlen;i++) {
						let val = null;
						if(i==0) {
							val = (match.length>1? match[1]:match[0]);
						}
						else {
							val = match[i+1] || this.empty(obj);
						}

						if(typeof(val)=='string') val = val.trim();
						results.push({name:names[i], value:val});
						obj[names[i]] = val;
					}
				}

				if(rule.set && rule.set.length) {
					let vset = rule.set, vlen = vset.length;
					for(let j=0;j<vlen;j++) {
						let s = vset[j];
						let r = {name:s.key(obj), value:s.value(obj)};
						results.push(r);
						obj[r.name] = r.value;
					}
				}
			}
		}
	}
}

module.exports = StateMachine;
