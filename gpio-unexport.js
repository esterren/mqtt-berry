/**
 * Created by rest on 01.05.14.
 */
var sh = require('execSync'),
    config = require("./config.json"),
    Gpio = require("onoff").Gpio;

if(config.berryclip.leds){
    config.berryclip.leds.forEach(function(obj){

            console.log("Unexport GPIO Pin " +obj.gpio_nr);
            var result = sh.exec('gpio-admin unexport '+ obj.gpio_nr+'; echo some_err 1>&2; exit 1');
            console.log('return code ' + result.code);

    });

}