var mqtt = require("mqtt"),
    Gpio = require("onoff").Gpio,
    config = require("./config.json");
//    leds = require("./leds.js");
//var gpio = require("pi-gpio");
//gpio = require("gpio"),


var ledarray = [];
var basetopic = config.mqtt.options.clientId +'/berryclip/',
    ledtopic = basetopic+'led/',
    ledstatuspattern = new RegExp("^"+ledtopic.replace('/',"\\/")+'[0-9]+\/status',"g");

client = mqtt.createClient(config.mqtt.port, config.mqtt.host, config.mqtt.options);
client.subscribe(basetopic+'/#');

config.berryclip.leds.forEach(function(obj){
    console.log(obj, obj.gpio_nr,obj.direction);
    var led = new Gpio(obj.gpio_nr,obj.direction);
    obj.led = led;
    console.log(obj);
    ledarray.push(obj);
    client.publish(ledtopic+obj.id+'/color', obj.color);
    client.publish(ledtopic+obj.id+'/description', obj.description);
    client.publish(ledtopic+obj.id+'/status', 'on');
});


client.on('message', function (topic, message) {

    console.log(topic, message);
    if(ledstatuspattern.test(topic)){
        var ledid = topic.replace(ledtopic,'').match(/[0-9]+/g)[0];
        console.log(ledid);

        arrid = arrayObjectIndexOf(ledarray,ledid,'id');
        if(message.toUpperCase()=='ON'){

            ledarray[arrid].led.write(1, function(err) { // Asynchronous write.
                if (err) throw err;
            });
        }else if(message.toUpperCase()=='OFF'){
            ledarray[arrid].led.write(0, function(err) { // Asynchronous write.
                if (err) throw err;
            });
        }

    }
});


//client.end();

/*

var gpio4, gpio17, intervalTimer;

// Flashing lights if LED connected to GPIO7
gpio4 = gpio.export(4, {
   ready: function() {
      intervalTimer = setInterval(function() {
         gpio4.set();
         setTimeout(function() { gpio4.reset(); }, 500);
      }, 1000);
   }
});

// Lets assume a different LED is hooked up to pin 11, the following code
// will make that LED blink inversely with LED from pin 7
gpio17 = gpio.export(17, {
   ready: function() {
      // bind to gpio17's change event
      gpio4.on("change", function(val) {
         gpio17.set(1 - val); // set gpio11 to the opposite value
      });
   }
});


// reset the headers and unexport after 10 seconds
setTimeout(function() {
   clearInterval(intervalTimer);          // stops the voltage cycling
   gpio4.removeAllListeners('change');   // unbinds change event
   gpio4.reset();                        // sets header to low
   gpio4.unexport();                     // unexport the header

   gpio17.reset();
   gpio17.unexport(function() {
      // unexport takes a callback which gets fired as soon as unexporting is done
      process.exit(); // exits your node program
   });
}, 10000);
*/


function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
}