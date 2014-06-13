var mqtt = require('mqtt'),
    port = 1883,
    host = '192.168.1.20',
    options = {
        clientId:process.argv[2],
        will:{
            topic:'presence',
            payload:'rpi failed',
            qos:1,
            retain:true
        },
        clean:false
    };


client = mqtt.createClient(port, host, options);
// or , client = mqtt.createClient(1883, host, {keepalive: 10000});


client.on('message', function (topic, message) {
    console.log(topic, message);
});

client.subscribe('presence',{qos:1});
//client.publish('presence', 'bin hier');


//client.end();
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (chunk) {
//    client.publish('presence', chunk,{qos:1,retain:true});

    client.publish('presence', chunk,{qos:1,retain:true});
});