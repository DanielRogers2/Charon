/* ----------------------------------
   DeviceDriverKeyboard.js

   Requires deviceDriver.js

   The Kernel Keyboard Device Driver.
   ---------------------------------- */

// "Inherit" from prototype DeviceDriver in deviceDriver.js.
DeviceDriverKeyboard.prototype = new DeviceDriver;

/**
 * Creates a new keyboard device driver. Call driverEntry to initialize
 * 
 * @returns {DeviceDriverKeyboard}
 */
function DeviceDriverKeyboard( ) {
    // "subclass"-specific attributes.
    // this.buffer = ""; // TODO: Do we need this?
    this.capsToggle = false;

    // Queue for handling input characters
    this.inputQ = undefined;
    // Tracing function for tracing errors
    this.trace = undefined;

    // handle odd translations
    // shifted numbers
    this.shiftTable =
    {
        // , -> <
        44 : 60,
        // - -> _
        45 : 95,
        // . -> >
        46 : 62,
        // 1 -> !
        49 : 33,
        // 2 -> @
        50 : 64,
        // 3 -> #
        51 : 35,
        // 4 -> $
        52 : 36,
        // 5 -> %
        53 : 37,
        // 6 -> ^
        54 : 94,
        // 7 -> &
        55 : 38,
        // 8 -> *
        56 : 42,
        // 9 -> (
        57 : 40,
        // 0 -> )
        48 : 41,
        // / -> ?
        47 : 63,
        // ; -> :
        59 : 58,
        // ' -> "
        39 : 34,
        // ` -> ~
        96 : 126,
        // = -> +
        61 : 43,
        // [ -> {
        91 : 123,
        // ] -> }
        93 : 125,
        // \ -> |
        92 : 124
    };

    // handle non-ascii values for chrome
    this.chromeASCIITrans =
    {
        // ,
        188 : 44,
        // .
        190 : 46,
        // /
        191 : 47,
        // ;
        186 : 59,
        // '
        222 : 39,
        // `
        192 : 96,
        // -
        189 : 45,
        // =
        187 : 61,
        // [
        219 : 91,
        // ]
        221 : 93,
        // \
        220 : 92
    };
}

DeviceDriverKeyboard.prototype.isr = function( params ) {
    // Parse the params.
    var keyCode = params[0];
    var isShifted = params[1];

    if ( DEBUG ) {
        console.log(keyCode);
    }

    if ( this.trace )
        this.trace("Key code:" + keyCode + " shifted:" + isShifted);

    var chr = "";
    // Check to see if we even want to deal with the key that was pressed.
    if ( ( ( keyCode >= 65 ) && ( keyCode <= 90 ) )
            || ( ( keyCode >= 97 ) && ( keyCode <= 123 ) ) ) {
        // A-Z or a-z
        // Determine the character we want to display.

        if ( isShifted && !this.capsToggle ) {
            // upper case character
            chr = String.fromCharCode(keyCode);
        }
        else {
            // it's lowercase...
            chr = String.fromCharCode(keyCode + 32);
        }
    }
    else if ( ( keyCode >= 48 ) && ( keyCode <= 57 ) ) {
        // digits
        if ( isShifted ) {
            keyCode = this.shiftTable[keyCode];
            if ( DEBUG ) {
                console.log("shifted to " + keyCode);
            }
        }

        chr = String.fromCharCode(keyCode);
    }
    else if ( ( keyCode === 32 ) || ( keyCode === 13 ) || ( keyCode === 8 ) ) {
        // space, enter, or backspace
        chr = String.fromCharCode(keyCode);
    }
    else if ( ( keyCode >= 186 ) && ( keyCode <= 222 ) ) {
        // ; to '
        // handle Chrome not mapping ; to ' as ASCII
        keyCode = this.chromeASCIITrans[keyCode];
        if ( DEBUG ) {
            console.log("translated to " + keyCode);
        }

        if ( isShifted ) {
            // check for < to "
            keyCode = this.shiftTable[keyCode];

            if ( DEBUG ) {
                console.log("shifted to " + keyCode);
            }
        }

        chr = String.fromCharCode(keyCode);
    }
    else if ( ( keyCode === 38 || keyCode === 40 ) ) {
        // arrow keys
        // no ASCII values for this, and the keyCodes would correspond to &
        // and )
        // use the raw code
        chr = keyCode;
    }
    else if ( ( keyCode === 20 ) ) {
        // caps lock
        this.capsToggle = !this.capsToggle;
    }
    else if ( ( keyCode === 16 ) ) {
        // shift
        // do nothing
    }
    else {
        if ( this.trace )
            this.trace("Key code:" + keyCode + " not recognized..");
    }

    this.inputQ.enqueue(chr);
};

/**
 * Initializes the device driver for key input handling
 * 
 * @param inputQ
 *            A buffer to queue up processed key inputs
 * @param tracing_fn
 *            An optional function for tracing events. Strings representing
 *            status/trace events will be passed to the function as a single
 *            argument.
 */
DeviceDriverKeyboard.prototype.driverEntry = function( inputQ, tracing_fn ) {
    this.inputQ = inputQ;
    this.trace = tracing_fn;

    this.status = "loaded";
};
