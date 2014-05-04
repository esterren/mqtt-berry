var mqtt = require('mqtt'),
    port = 1883,
    host = '192.168.1.20';

client = mqtt.createClient(port, host);
  // or , client = mqtt.createClient(1883, host, {keepalive: 10000});

client.subscribe('presence');
client.publish('presence', 'bin hier');
client.on('message', function (topic, message) {
  console.log(topic,message);
});
//client.end();
