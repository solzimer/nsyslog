const amqp = require('amqplib');

var q = 'test';
var url = 'amqps://ydhsfzhp:57XiJBwJMKnHfCZTpFM0Eu1650USYXII@rat.rmq2.cloudamqp.com/ydhsfzhp';

async function run() {
    let client = await amqp.connect(url);
    let channel = await client.createChannel();
    await channel.assertQueue(q);
    await channel.sendToQueue(q, Buffer.from('something to do'));
}

run();