## HTTPSM Input

The HTTPSM Input allows fetching data from HTTP/HTTPS endpoints in a state-machine-driven manner. It supports dynamic state transitions, conditional logic, and data storage between states.

## Examples

Fetch data from VirusTotal API with login and subsequent API call:
```json
"inputs": {
	"vt_api": {
		"type": "httpsm",
		"disabled": false,
		"config": {
			"start": "login",
			"states": {
				"login": {
					"options": {
						"method": "POST",
						"url": "https://www.virustotal.com/api/v3/auth/login",
						"headers": {
							"Content-Type": "application/json"
						},
						"body": {
							"username": "your_username",
							"password": "your_password"
						},
						"json": true
					},
					"emit": [
						{
							"when": "${res.statusCode} == 200",
							"store": { "token": "${body.token}" },
							"next": "getReport",
							"timeout": 10000,
							"log": { "level": "info", "message": "Login successful" }
						},
						{
							"when": "${res.statusCode} != 200",
							"next": "login",
							"timeout": 60000,
							"log": { "level": "error", "message": "Login failed: ${body.error}" }
						}
					]
				},
				"getReport": {
					"options": {
						"method": "GET",
						"url": "https://www.virustotal.com/api/v3/files/{file_id}",
						"headers": {
							"Authorization": "Bearer ${token}"
						}
					},
					"emit": [
						{
							"when": "${res.statusCode} == 200",
							"publish": "${body}",
							"next": "getReport",
							"timeout": 30000,
							"log": { "level": "info", "message": "Report fetched successfully" }
						},
						{
							"when": "${res.statusCode} != 200",
							"next": "login",
							"timeout": 60000,
							"log": { "level": "error", "message": "Failed to fetch report: ${body.error}" }
						}
					]
				}
			}
		}
	}
}
```

## Configuration parameters
* **start**: The initial state to start the state machine. Can be dynamically evaluated using expressions.
* **states**: An object defining the states of the state machine. Each state includes:
  - **url**: The endpoint URL to fetch data from.
  - **options**: HTTP request options, such as method, headers, and body.
  - **emit**: An array of conditions and actions to perform based on the response. Each emit includes:
    - **when**: A condition to evaluate for the response.
    - **next**: The next state to transition to.
    - **timeout**: Timeout in milliseconds before the next fetch.
    - **store**: Data to store for use in subsequent states.
    - **publish**: Data to publish as the output of the input.
    - **log**: Logging configuration for the state transition.

## Output
Each fetch generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'httpsm',
	url: '<requested URL>',
	statusCode: <HTTP status code>,
	headers: { <response headers> },
	httpVersion: '<HTTP version>',
	originalMessage: '<response body>'
}
```
