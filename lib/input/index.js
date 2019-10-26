const Component = require('../component');

/**
 * Abstract Input class
 * @description Inputs are responsible for reading data from sources and send them to the flows in order to be processed.<br/>
 * An input can be whatever mechanism that allows reading data from any source, such as a text file, database, message queue, TCP/UDP server, etc..<br/>
 * There are two kinds of inputs:<br/>
 * <ul>
 * 	<li>Pull Inputs : Pull inputs activelly read data. It means that, when requested, pull inputs will fetch a line of data, transforms it to an entry, and sends it to the flows. Then, it will wait for the next request. This way, the NSyslog process will not overflow, since data is only transmited and processed as needed, in a controlled manner. Examples of pull inputs are: File readers, database readers...</li>
 * 	<li>Push Inputs : Push inputs listens for data from the sources. As soon a source sends data to the input, it transforms them to a entry and sends them to the flows. Push inputs cannot control when data arrives, and if there's more data than NSyslog can handle at a time, it may overflow the process. To solve this issue, entries comming from push inputs are buffered to disk, and flows request them from there. Examples of push inputs are: HTTP servers, WebSocket servers, Redis pub/sub...</li>
 * </ul>
 * @class
 * @abstract
 * @extends Component
 * @param {string} id Input alias
 * @param {string} type Input type id
 */
class Input extends Component {
	constructor(id,type) {
		super(id,type);
	}

	/**
	 * Returns what mode runs this input (push or pull)
	 * @return {Input.MODE}
	 */
	get mode() {
		return MODE.push;
	}

	async watermarks() {
		return [];
	}

	/**
	 * Starts the input instance. If input is in "pull" mode, this method
	 * is expected to start all resources and return immediately. Then, data
	 * will be requested via {@link Input.next} method. If input is in "push"
	 * mode, the callback function will be called whenever a data entry is
	 * collected by the component.
	 * @param  {Function} callback callback function
	 */
	start(callback) {
		super.start(callback);
	}

	/**
	 * In pull mode, this method is called to request a data entry
	 * @param  {Function} callback Callback function that will receive the data entry
	 */
	next(callback) {

	}
}

/**
 * Input modes
 * @type {enum}
 * @property {string} push Push mode
 * @property {string} pull Pull mode
 */
Input.MODE = {
	push:"push",
	pull:"pull"
}


module.exports = Input;
