var mqtt = require("mqtt"),
    Gpio = require("onoff").Gpio,
    sh = require('execSync'),
    config = require("./config.json");
//    leds = require("./leds.js");
//var gpio = require("pi-gpio");
//gpio = require("gpio"),

var ledStates= {
        ON: {'value':1,'description':'ON'},
        OFF:{'value':0,'description':'OFF'}
}

var ledsA = [];
var basetopic = config.mqtt.options.clientId +'/berryclip/',
    ledtopic = basetopic+'led/',
    ledstatuspattern = new RegExp("^"+ledtopic.replace('/',"\\/")+'[0-9]+\/status',"g");

client = mqtt.createClient(config.mqtt.port, config.mqtt.host, config.mqtt.options);
client.subscribe(basetopic+'/#');

(function initGPIOs(){
    exportGPIOs();
    if(config.berryclip.leds){
        config.berryclip.leds.forEach(function(obj){
            var ledObject = new Gpio(obj.gpio_nr,obj.direction);
            obj.ledObject = ledObject;
            obj.status = ledStates.ON;
            console.log(obj);
            ledsA.push(obj);
            ledObject.writeSync(obj.status.value);
            client.publish(ledtopic+obj.id+'/color', obj.color);
            client.publish(ledtopic+obj.id+'/description', obj.description);
            client.publish(ledtopic+obj.id+'/status', obj.status.description);
        });

    }
})();



client.on('message', function (topic, message) {

    console.log(topic, message);
    if(ledstatuspattern.test(topic)){
        var ledid = topic.replace(ledtopic,'').match(/[0-9]+/g)[0];
        console.log(ledid);

        arrid = arrayObjectIndexOf(ledsA,ledid,'id');
        console.log(arrid);
        if(message.toUpperCase()=='ON'){

            ledsA[arrid].ledObject.write(1, function(err) { // Asynchronous write.
                if (err) throw err;
            });
        }else if(message.toUpperCase()=='OFF'){
            ledsA[arrid].ledObject.write(0, function(err) { // Asynchronous write.
                if (err) throw err;
            });
        }

    }
});


//client.end();


function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
}

/*
    This function exports all configured GPIOs,
    because superuser privileges are required for exporting and using GPIOs on the RPi.
 */
function exportGPIOs(){
    if(config.berryclip.leds){
        config.berryclip.leds.forEach(function(obj){
            console.log("Exporting GPIO Pin " +obj.gpio_nr);
            var result = sh.exec('gpio-admin export '+ obj.gpio_nr+'; echo some_err 1>&2; exit 1');
            console.log('return code ' + result.code);
        });

    }
}

/*
    This function sets the IO-value to 0 and unexports the GPIOs
 */
function unexportGPIOs(){
    if(config.berryclip.leds){
        config.berryclip.leds.forEach(function(obj){

            ledsA.forEach(function(obj){
                obj.ledObject.write(0,function(){

                    //console.log("Unexport GPIO Pin " +obj.gpio_nr);
                    var result = sh.exec('gpio-admin unexport '+ obj.gpio_nr+'; echo some_err 1>&2; exit 1');
                    //console.log('return code ' + result.code);
                });
            })
        });

    }
}

function exitHandler(options, err) {
    if (options.cleanup){
        console.log(' Exiting...');
        unexportGPIOs();
//        ledsA.forEach(function (led) {
//            led.ledObject.writeSync(0);
//            led.ledObject.unexport();
//        });
    }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));