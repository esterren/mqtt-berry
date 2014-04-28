//var gpio = require("pi-gpio");
var gpio = require("gpio");

/*gpio.open(7, "output", function(err) {     // Open pin 16 for output
    gpio.write(7, 1, function() {          // Set pin 16 high (1)
        gpio.close(7);                     // Close pin 16
    });
});*/

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
