var mqtt = require("mqtt"),
    Gpio = require("onoff").Gpio,
    sh = require('execSync'),
    HashMap = require('hashmap').HashMap,
    map = new HashMap(),
    config = require("./config.json");
//    leds = require("./leds.js");

var onoffStates= {
        ON: {'value':1,'description':'ON'},
        OFF:{'value':0,'description':'OFF'}
}

var activeInactiveStates= {
    ACTIVE: {'value':true,'description':'ACTIVE'},
    INACTIVE:{'value':false,'description':'INACTIVE'}
}

var ledsA = [],
    buzzerA = [],
    buttonA = [];

var basetopic = config.mqtt.connect_options.clientId +'/berryclip/',
    ledtopic = basetopic+'leds/',
    buzzertopic = basetopic+'buzzers/',
    buttontopic = basetopic+'buttons/';

var timeoutObj;

/*
Setup the secure mqtt Client, subscribe to # and publish the ONLINE state for the RPi
 */
client = mqtt.createSecureClient(config.mqtt.port, config.mqtt.host, config.mqtt.connect_options);
client.subscribe(basetopic+'/#');
client.publish(config.mqtt.connect_options.will.topic,'ONLINE',config.mqtt.publish_options);

/**
 * the initGPIOs() function exports the GPIO Pins and sets up all the needed objects like leds, buzzers and buttons.
 * Any LED and buzzer is initialized with the OFF state and buttons with the ACTIVE state. Those states are published
 * on startup to the broker, regardless which state was last saved/persisted on the broker.
 */
(function initGPIOs(){
    exportGPIOs();

    /*
    helper function to setup actors like LEDs and buzzers.
     */
    function setupActors(obj, topic, array, propertyArray){
        var gpioObj = new Gpio(obj.gpio_nr, obj.direction, obj.edge);
        obj.gpioObject = gpioObj;
        obj.status= onoffStates.OFF;
//        console.log(obj);
        array.push(obj);

        gpioObj.watch(function(err, value){
            if(err) exit();
            obj.status = (value == onoffStates.ON.value)? onoffStates.ON : onoffStates.OFF;
            mqttPublish(obj, topic+obj.id+'/status', obj.status.description,config.mqtt.publish_options);

        });
        gpioObj.writeSync(obj.status.value);
        mqttPublish(obj, topic+obj.id+'/status', obj.status.description,config.mqtt.publish_options);
        propertyArray.forEach(function(entry){
            mqttPublish(obj, topic+obj.id+'/'+entry,obj[entry],config.mqtt.publish_options)
        })

    };


    /*
    For each configured led in config.json setup an object
     */
    if(config.berryclip.leds){
        config.berryclip.leds.forEach(function(obj){
            setupActors(obj, ledtopic,ledsA,["color","description"]);
        });

    }

    /*
     For each configured buzzer in config.json setup an object
     */
    if(config.berryclip.buzzers){
        config.berryclip.buzzers.forEach(function(obj){
            setupActors(obj, buzzertopic,buzzerA,["description"]);
        });

    }

    /*
     For each configured button in config.json setup an object
     */
    if(config.berryclip.buttons){
        config.berryclip.buttons.forEach(function(obj){
            var butObject = new Gpio(obj.gpio_nr,obj.direction,obj.edge);
            obj.butObject = butObject;
            obj.status = activeInactiveStates.ACTIVE;

            buttonA.push(obj);
            butObject.watch(function(err, value){
                if(err) exit();
                if(obj.status.value){
                    ledsA.forEach(function(obj){
                        obj.gpioObject.writeSync(value);
                    });
                    buzzerA.forEach(function(obj){
                        obj.gpioObject.writeSync(value);
                    })
                };
            });
            mqttPublish(obj, buttontopic+obj.id+'/status', obj.status.description,config.mqtt.publish_options);
        });

    }
})();


/**
 * This part processes any incoming message
 */
client.on('message', function (topic, message) {

    console.log('IN:',topic, message);

    // Checks if the topic was published by RPi and if not empty message
    var obj = map.get(topic);
    if(obj && message){

        // when the current topic status  belongs to onoffState
        if(obj.status ===onoffStates.OFF || obj.status ===onoffStates.ON){
            // ... and the message is ON or OFF
            if(onoffStates[message.toUpperCase()]){
                // Clear the timeout Object for buzzer topic
                if(topic.match(/\/buzzers\/\d\/status/g)&& timeoutObj){
                    clearTimeout(timeoutObj)
                };
                // then the gpioObject will get the new state (ON or OFF)
                obj.gpioObject.write(onoffStates[message.toUpperCase()].value,function(err){
                    if (err) throw err;
                });
            }

            // schedule a timeout for the buzzer if the message is a number betw. 0 and 31
            if(topic.match(/\/buzzers\/\d\/status/g) && parseInt(message,10) >=1 && parseInt(message,10) <=30){
                clearTimeout(timeoutObj);
                obj.gpioObject.write(onoffStates.ON.value, function(err){
                    if (err) throw err;
                });

                timeoutObj = setTimeout(function(){
                    obj.gpioObject.write(onoffStates.OFF.value, function(err){
                        if (err) throw err;
                    })
                },message*1000)
            }
        }
        // activate, deactivate the button on the berryclip board
        if(obj.status ===activeInactiveStates.ACTIVE || obj.status === activeInactiveStates.INACTIVE){
            if(activeInactiveStates[message.toUpperCase()]){
                obj.status = activeInactiveStates[message.toUpperCase()];
//                console.log(obj);
            }
        }
    }
});

/**
 * This function publishes topics and messages over the mqtt client
 * @param obj a led, buzzer or button object (modeled like in config.json)
 * @param topic the topic to publish
 * @param message the content of the message
 * @param options any publish options for the mqtt client
 * @param callback a callback function if needed (opt.)
 */
function mqttPublish(obj, topic, message, options, callback){
    map.set(topic,obj);
    console.log('OUT:', topic,message);
    client.publish(topic,message, options, callback);

}

//client.end();

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

    ledsA.forEach(function(obj){
        _unexportGPIO(obj);
    });
    buzzerA.forEach(function(obj){
        _unexportGPIO(obj);
    });
    buttonA.forEach(function(obj){
        var result = sh.exec('gpio-admin unexport '+ obj.gpio_nr+'; echo some_err 1>&2; exit 1');
    });

    function _unexportGPIO(obj){
        obj.gpioObject.write(0,function(){
            var result = sh.exec('gpio-admin unexport '+ obj.gpio_nr+'; echo some_err 1>&2; exit 1');
        });
//        console.log("Unexporting GPIO Pin " +obj.gpio_nr);

//        console.log('return code ' + result.code);
    }
}

function exit() {
    process.exit();
}

function exitHandler(options, err) {
    if (options.cleanup){
        console.log(' Exiting...');
        unexportGPIOs();
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