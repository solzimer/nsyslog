## Nools Processor

The Nools Processor uses the [Nools](https://github.com/C2FO/nools) rules engine to process log entries. It allows defining rules in a `.nools` file to assert, modify, and retract entries based on complex conditions.

## Examples

### Example 1: Process log entries using Nools rules
#### Configuration
```json
"processors": {
	"noolsProcessor": {
		"type": "nools",
		"config": {
			"path": "./rules/myrules.nools"
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "This is a test message",
	"level": "info"
}
```

#### Rules (`myrules.nools`)
```javascript
rule "Log Info Messages"
	when {
		e: Entry e.level == "info";
	}
	then {
		logger.info("Processing info message:", e.originalMessage);
		modify(e, function() {
			this.processed = true;
		});
	}
}
```

#### Output
```json
{
	"originalMessage": "This is a test message",
	"level": "info",
	"processed": true
}
```

---

## Configuration Parameters
* **path**: Path to the `.nools` file containing the rules.

---

## How It Works
1. The processor compiles the `.nools` file into a rules engine.
2. Log entries are asserted into the Nools session as `Entry` objects.
3. Rules defined in the `.nools` file are evaluated against the entries.
4. Actions such as modifying or retracting entries are performed based on the rules.
5. The processor pushes modified entries back into the processing pipeline.

---

## Notes
- The Nools processor supports custom logic for asserting, modifying, and retracting entries.
- Ensure that the `.nools` file is valid and follows the Nools syntax.
