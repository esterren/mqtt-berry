var mqtt = require("mqtt"),
    Gpio = require("onoff").Gpio,
    sh = require('execSync'),
    config = require("./config.json");
//    leds = require("./leds.js");

var onoffStates= {
        ON: {'value':1,'description':'ON'},
        OFF:{'value':0,'description':'OFF'}
}

var ledsA = [],
    buzzerA = [],
    buttonA = [];

var basetopic = config.mqtt.options.clientId +'/berryclip/',
    ledtopic = basetopic+'leds/',
    buzzertopic = basetopic+'buzzers/',
    buttontopic = basetopic+'buttons/',
    ledstatuspattern = new RegExp("^"+ledtopic.replace('/',"\\/")+'[0-9]+\/status',"g"),
    buzzerstatuspattern = new RegExp("^"+buzzertopic.replace('/',"\\/")+'[0-9]+\/status',"g"),
    buttonstatuspattern = new RegExp("^"+buttontopic.replace('/',"\\/")+'[0-9]+\/status',"g");

client = mqtt.createClient(config.mqtt.port, config.mqtt.host, config.mqtt.options);
client.subscribe(basetopic+'/#');

(function initGPIOs(){
    exportGPIOs();
//    if(config.berryclip.leds){
//        config.berryclip.leds.forEach(function(obj){
//            var ledObject = new Gpio(obj.gpio_nr,obj.direction);
//            obj.ledObject = ledObject;
//            obj.status = onoffStates.ON;
//            console.log(obj);
//            ledsA.push(obj);
//            ledObject.writeSync(obj.status.value);
//            client.publish(ledtopic+obj.id+'/color', obj.color);
//            client.publish(ledtopic+obj.id+'/description', obj.description);
//            client.publish(ledtopic+obj.id+'/status', obj.status.description);
//        });
//
//    }

    if(config.berryclip.leds){
        config.berryclip.leds.forEach(function(obj){
            var ledObject = new Gpio(obj.gpio_nr,obj.direction);
            obj.ledObject = ledObject;
            obj.status = onoffStates.OFF;
            console.log(obj);
            ledsA.push(obj);
            ledObject.writeSync(obj.status.value);
            client.publish(ledtopic+obj.id+'/color', obj.color);
            client.publish(ledtopic+obj.id+'/description', obj.description);
            client.publish(ledtopic+obj.id+'/status', obj.status.description);
        });

    }

    if(config.berryclip.buzzers){
        config.berryclip.buzzers.forEach(function(obj){
            var buzObject = new Gpio(obj.gpio_nr,obj.direction);
            obj.buzObject = buzObject;
            obj.status = onoffStates.OFF;
            console.log(obj);
            buzzerA.push(obj);
            buzObject.writeSync(obj.status.value);
            client.publish(buzzertopic+obj.id+'/description', obj.description);
            client.publish(buzzertopic+obj.id+'/status', obj.status.description);
        });

    }
    if(config.berryclip.buttons){
        config.berryclip.buttons.forEach(function(obj){
            var butObject = new Gpio(obj.gpio_nr,obj.direction,obj.edge);
            obj.butObject = butObject;
            obj.status = onoffStates.OFF;
            console.log(obj);
            buttonA.push(obj);
            butObject.watch(function(err, value){
                if(err) exit();
                ledsA.forEach(function(obj){
                    obj.ledObject.writeSync(value);
                });
                buzzerA.forEach(function(obj){
                    obj.buzObject.writeSync(value);
                })

            });
        });

    }
})();



client.on('message', function (topic, message) {

    console.log(topic, message);
    if(ledstatuspattern.test(topic)){
        var ledid = parseInt(topic.replace(ledtopic,'').match(/[0-9]+/g)[0]);
        console.log(ledid);

        tlid = arrayObjectIndexOf(ledsA,ledid,'id');
        console.log(tlid);
        if(tlid>=0){
            if(onoffStates[message.toUpperCase()]){

                ledsA[tlid].ledObject.write(onoffStates[message.toUpperCase()].value, function(err) { // Asynchronous write.
                    if (err) throw err;
                    //ledsA[tlid].status = onoffStates.ON;
                });
            }
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
            _exportGPIO(obj);
        });
    }
    if(config.berryclip.buzzers){
        config.berryclip.buzzers.forEach(function(obj){
            _exportGPIO(obj);
        });
    }
    if(config.berryclip.buttons){
        config.berryclip.buttons.forEach(function(obj){
            _exportGPIO(obj);
        });
    }

    function _exportGPIO(obj){
        console.log("Exporting GPIO Pin " +obj.gpio_nr);
        var result = sh.exec('gpio-admin export '+ obj.gpio_nr+'; echo some_err 1>&2; exit 1');
        console.log('return code ' + result.code);
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