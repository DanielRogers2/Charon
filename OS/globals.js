/* ------------  
   Globals.js

   Global CONSTANTS and _Variables.
   (Global over both the OS and Hardware Simulation / Host.)
   
   This code references page numbers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

//
// Global CONSTANTS
//
var APP_NAME = "Charon";  //ferryman of the dead, appropriate for an OS written in JS
var APP_VERSION = "0.01"; 

var CPU_CLOCK_INTERVAL = 10;   // This is in ms, or milliseconds, so 1000 = 1 second.

var TIMER_IRQ = 0;  // Pages 23 (timer), 9 (interrupts), and 561 (interrupt priority).
                    // NOTE: The timer is different from hardware/host clock pulses. Don't confuse these.
var KEYBOARD_IRQ = 1;  

var DISPLAY_IRQ = 2;

var CONSOLE_CANVASID = 0;
var STATUS_CANVASID = 1;

//turn on/off console DEBUG
var DEBUG = false;

//
// Global Variables
//
var _CPU = null;

var _OSclock = 0;       // Page 23.

var _Mode = 0;   // 0 = Kernel Mode, 1 = User Mode.  See page 21.

var _Canvases = null;               // Initialized in hostInit().
var _DrawingContexts = null;       // Initialized in hostInit().
var _DefaultFontFamily = "12px Courier"; 
var _DefaultFontSize = 12;
var _FontHeightMargin = 4;        // Additional space added to font size when advancing a line.

// Default the OS trace to be on.
var _Trace = true;

// OS queues
var _KernelInterruptQueue = null;
var _KernelBuffers = null;
var _KernelInputQueue = null;

// Standard input and output
var _StdIn  = null;
var _StdOut = null;

// UI
var _Console = null;
var _OsShell = null;
var _Clock = null;

// At least this OS is not trying to kill you. (Yet.)
var _SarcasticMode = false;

// Global Device Driver Objects - page 12
var krnKeyboardDriver = null;

// For testing...
var _GLaDOS = null;

/*
 * Deep copy canvas
 */
function cloneCanvas(canvas) {
    var copy = document.createElement('canvas');
    var ctxt = copy.getContext('2d');
    
    copy.height = canvas.height;
    copy.width = canvas.width;
    
    ctxt.drawImage(canvas, 0, 0);
    
    return copy;
}
