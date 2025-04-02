const
	logger = require('../../logger'),
	extend = require("extend"),
	jsexpr = require('jsexpr');

const START = "start";
const IGNORE = {
	"text" : true,
	"void" : true,
	"" : true
};

function toRuleSet(rules) {
	let ruleset = {};

	rules.forEach(rule=>{
		rule.from = rule.src || START;
		ruleset[rule.src] = ruleset[rule.src] || [];
		ruleset[rule.src].push(rule);
		try {
			rule.rx = new RegExp(rule.re);
		}catch(err) {
			this.rx = /^$/;
		}
	});

	return ruleset;
}

class StateMachine {

	constructor(rules, multi, emptyfield) {
		this.rules = toRuleSet(rules);
		this.state = START;
		this.multi = multi || false;

		// Indica qué hacer con los grupos que salen vacíos
		this.empty = jsexpr.expr(emptyfield || '${__}');
	}

	parse(line) {
		let prevLine = "";

		// A la hora de parsear, __ almacena el fragmento de linea a parsear por la regla
		let obj = {_:line,__:line};
		let results = [];
		
		this.state = this.multi? this.state : START;

		while(true) {
			// Evitar bucles infinitos
			if(line == prevLine) return results;

			let state = this.rules[this.state] || this.rules[START];
			let match = null, rule = null;

			if(!line) return results;

			for(let i=0;i<state.length;i++) {
				let r = state[i];
				if(!r.rx) {
					logger.error(`Invalid rule for state ${this.state}: `,r);
					continue;
				}
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
			else if(match) {
				if(rule.reject) return null;

				prevLine = line;
				line = obj.__ = line.substring(match.index+match[0].length);
				this.state = rule.dst || this.state;
				Object.keys(match.groups||[]).forEach(k=>{
					let v = match.groups[k];
					results.push({name:k,value:v});
				});
			}
		}
	}
}

module.exports = StateMachine;
