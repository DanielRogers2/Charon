/* ----------------------------------
   DeviceDriverKeyboard.js

   Requires deviceDriver.js

   The Kernel Keyboard Device Driver.
   ---------------------------------- */

DeviceDriverKeyboard.prototype = new DeviceDriver;  // "Inherit" from prototype DeviceDriver in deviceDriver.js.

function DeviceDriverKeyboard()                     // Add or override specific attributes and method pointers.
{
    // "subclass"-specific attributes.
    // this.buffer = "";    // TODO: Do we need this?
    this.capsToggle = false;

    //handle odd translations
    this.shiftTable = {
            //shifted numbers
            49:33   //1->!
            , 50:64 //2->@
            , 51:35 //3->#
            , 52:36 //4->$
            , 53:37 //5->%
            , 54:94 //6->^
            , 55:38 //7->&
            , 56:42 //8->*
            , 57:40 //9->(
            , 48:41 //0->)
            , 44:60 //,-><
            , 46:62 //.->>
            , 47:63 ///->?
            , 59:58 //;->:
            , 39:34 //'->"
            , 96:126//`->~
            , 45:95 //-->_
            , 61:43 //=->+
            , 91:123//[->{
            , 93:125//]->}
            , 92:124//\-?|
    };
    //handle non-ascii values for chrome
    this.chromeASCIITrans = {
            188:44   // ,
            , 190:46 // .
            , 191:47 // /
            , 186:59 // ;
            , 222:39 // '
            , 192:96 // `
            , 189:45 // -
            , 187:61 // =
            , 219:91 // [
            , 221:93 // ]
            , 220:92 // \
    };

    // Override the base method pointers.
    this.driverEntry = function krnKbdDriverEntry()
    {
        // Initialization routine for this, the kernel-mode Keyboard Device Driver.
        this.status = "loaded";
        // More?
    };

    this.isr = function krnKbdDispatchKeyPress(params)
    {
        // Parse the params.    TODO: Check that they are valid and osTrapError if not.
        var keyCode = params[0];
        var isShifted = params[1];

        if (DEBUG === true) {
            console.log(keyCode);
        }

        krnTrace("Key code:" + keyCode + " shifted:" + isShifted);
        var chr = "";
        // Check to see if we even want to deal with the key that was pressed.
        if ( ((keyCode >= 65) && (keyCode <= 90)) ||   // A..Z
                ((keyCode >= 97) && (keyCode <= 123)) )   // a..z
        {
            // Determine the character we want to display.  

            if (isShifted && !this.capsToggle) {
                //upper case character
                chr = String.fromCharCode(keyCode);
            } else {
                //it's lowercase...
                chr = String.fromCharCode(keyCode + 32);
            }

            _KernelInputQueue.enqueue(chr);        
        } 
        
        else if ((keyCode >= 48) && (keyCode <= 57))   // digits
        {
            if(isShifted) {
                keyCode = this.shiftTable[keyCode];
                if(DEBUG === true) {
                    console.log("shifted to " + keyCode);
                }
            }

            chr = String.fromCharCode(keyCode);
            _KernelInputQueue.enqueue(chr);
        }
        else if ((keyCode == 32) ||   // space
                (keyCode == 13)  ||   // enter
                (keyCode == 8) )      //backspace
        {
            chr = String.fromCharCode(keyCode);
            _KernelInputQueue.enqueue(chr); 
        }
        
        else if ((keyCode >= 186) && (keyCode <= 222)) //; to '
        {
            //handle Chrome not mapping ; to ' as ASCII
            keyCode = this.chromeASCIITrans[keyCode];
            if(DEBUG === true) {
                console.log("translated to " + keyCode);
            }
            
            if(isShifted) {
                //check for < to "
                keyCode = this.shiftTable[keyCode];
                
                if(DEBUG === true) {
                    console.log("shifted to " + keyCode);
                }
            }

            chr = String.fromCharCode(keyCode);
            _KernelInputQueue.enqueue(chr);
        }
        
        else if ((keyCode == 20)) //caps lock
        {
            this.capsToggle = !this.capsToggle;
        }
        
        else {
            //osTrapError
        }
    };
}
