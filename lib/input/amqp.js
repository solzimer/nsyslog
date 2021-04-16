const
	logger = require('../logger'),
    amqp = require('amqplib'),
    timer = require('../util').timer,
	Input = require('./');

const FORMAT = {
	raw : "raw",
	json : "json"
};

const DEFAULTS = {
	url : "amqp://localhost",
	channel : "test",
	format : "raw"
};

class AMQPInput extends Input {
	constructor(id,type) {
		super(id,type);
		this.paused = false;
        this.conn = false;
	}

	configure(config,callback) {
		config = config || {};
		this.url = config.url || DEFAULTS.url;
		this.queue = config.queue || DEFAULTS.queue;
		this.format = FORMAT[config.format] || FORMAT.raw;

		callback();
	}

	get mode() {
		return Input.MODE.push;
	}

	async connect() {
        while(!this.conn) {
            try {
                let client = await amqp.connect(this.url);
                let channel = await client.createChannel();
            
                await channel.assertQueue(this.queue);
                this.conn = true;
                return channel;
            }catch(err) {
                logger.error(`[${this.id}]`,err);
                this.conn = false;
                await timer(5000);
            }
        }
	}

	async start(callback) {
        let channel = await this.connect();

        logger.info('Connected');

        channel.consume(this.queue,(msg)=>{
            console.log(msg);
            let data = msg.content.toString();
            
            if(this.format==FORMAT.json) {
                try {
                    data = JSON.parse(data);
                }catch(err){
                    logger.warn(`[${this.id}]`,err);
                }
            }

            channel.ack(msg);
            callback(null,{
                id : this.id,
                type : 'amqp',
                queue : this.queue,
                url : this.url,
                originalMessage : data
            });
        });
	}

	stop(callback) {
		callback();
	}

	pause(callback) {
		this.paused = true;
		callback();
	}

	resume(callback) {
		this.paused = false;
		callback();
	}
}

module.exports = AMQPInput;
