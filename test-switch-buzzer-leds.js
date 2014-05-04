/**
 * Created by rest on 04.05.14.
 */
var Gpio = require("onoff").Gpio,
    sh = require('execSync'),
    config = require("./config.json");

var onoffStates= {
    ON: {'value':1,'description':'ON'},
    OFF:{'value':0,'description':'OFF'}
}

var ledsA = [],
    buzzerA = [],
    buttonA = [];

(function initGPIOs(){
    exportGPIOs();
    if(config.berryclip.leds){
        config.berryclip.leds.forEach(function(obj){
            var ledObject = new Gpio(obj.gpio_nr,obj.direction);
            obj.ledObject = ledObject;
            obj.status = onoffStates.OFF;
            console.log(obj);
            ledsA.push(obj);
            ledObject.writeSync(obj.status.value);
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