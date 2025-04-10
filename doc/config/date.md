### `${DATE:...}` Expression

The `${DATE:...}` expression is used to dynamically parse and format date and time values. It leverages the `dayjs` library for parsing and formatting.

#### Syntax
```
${DATE:<property or new Date()>:<parse_format>|<output_format>}
```

- `<property or new Date()>`: A JavaScript expression that evaluates to a date. Defaults to `new Date()` if not provided.
- `<parse_format>`: A `dayjs` format string to parse the input date. Optional if the input is already a valid `Date` object.
- `<output_format>`: A `dayjs` format string to specify the desired output format. Defaults to returning a `Date` object if not provided.

#### Behavior
1. If no arguments are provided, the current date and time are returned as a `Date` object.
2. If only an output format is provided, the current date is formatted accordingly.
3. If a property and a parse format are provided, the property is parsed using the specified format, and the result is returned as a `Date` object unless an output format is specified.
4. If all three arguments are provided, the property is parsed using the parse format, and the result is formatted using the output format.

#### Examples
1. **Default Date**
   ```
   ${DATE}
   ```
   Output: Current date and time as a `Date` object.

2. **Custom Output Format**
   ```
   ${DATE:YYYY-MM-DD}
   ```
   Output: Current date formatted as `YYYY-MM-DD`.

3. **Property with Parse Format**
   ```
   ${DATE:obj.dateProp:YYYY-MM-DD}
   ```
   Output: Parses `obj.dateProp` using the format `YYYY-MM-DD` and returns a `Date` object.

4. **Property with Parse and Output Formats**
   ```
   ${DATE:obj.dateProp:YYYY-MM-DDTHH:mm:ss|HHmmss}
   ```
   Output: Parses `obj.dateProp` using the format `YYYY-MM-DDTHH:mm:ss` and formats the result as `HHmmss`.

#### Notes
- Ensure the property or expression evaluates to a valid date or timestamp.
- The format strings follow the `dayjs` formatting rules. Refer to the [dayjs documentation](https://day.js.org/docs/en/display/format) for more details.
