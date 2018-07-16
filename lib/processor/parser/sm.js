const
	extend = require("extend"),
	fs = require("fs-extra");

const START = "start";
const IGNORE = {
	"text" : true,
	"void" : true,
	"" : true
}

function toRuleSet(rules) {
	if(Array.isArray(rules)) {
		rules = {start : rules}
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

	constructor(rules, multi) {
		this.rules = toRuleSet(rules);
		this.state = START;
		this.multi = multi || false;
	}

	parse(line) {
		let results = [];

		while(true) {
			let state = this.rules[this.state] || this.rules[START];
			let match = null, rule = null;

			state.some(r=>{
				match = r.rx.exec(line);
				rule = r;
				return match != null;
			});

			if(!match && this.state!=START) {
				this.state = START;
			}
			else if(!match && this.state==START) {
				return results.filter(r=>!IGNORE[r.name]);
			}
			else {
				line = line.substring(match.index+match[0].length);
				this.state = rule.next || this.state;
				if(!rule.name || !rule.name.length) {
					continue;
				}
				else if(typeof(rule.name)=="string") {
					let val = match[1] || match[0];
					results.push({name:rule.name, value:val.trim()});
				}
				else if(Array.isArray(rule.name)) {
					if(rule.name.length==1) {
						let val = match[1] || match[0];
						results.push({name:rule.name, value:val.trim()});
					}
					else {
						for(let i=1;i<match.length;i++) {
							let val = match[i] || match[0];
							results.push({name:rule.name[i-1], value:val.trim()});
						}
					}
				}
			}
		}

		return results.filter(r=>!IGNORE[r.name]);
	}
}

module.exports = StateMachine;
