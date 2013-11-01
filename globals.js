/* ------------  
   Globals.js

   Global CONSTANTS and _Variables.
   (Global over both the OS and Hardware Simulation / Host.)

   This code references page numbers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

//Global CONSTANTS
var APP_NAME = "Charon"; // ferryman of the dead, appropriate for an OS
// written in JS
var APP_VERSION = "0.11";

var CPU_CLOCK_INTERVAL = 10; // This is in ms, or milliseconds, so 1000 = 1
// second.

// turn on/off console DEBUG
var DEBUG = false;

// Global Variables
var _DefaultFontFamily = "12px Courier";
var _DefaultFontSize = 12;
var _FontHeightMargin = 4; // Additional space added to font size when
// advancing a line.

// Default the OS trace to be on.
var _Trace = true;

//GLaDOS still looks at these
var _KernelInputQueue = null;
var krnInterruptHandler = null;

// At least this OS is not trying to kill you. (Yet.)
var _SarcasticMode = false;

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

/*
 * Convert Hex to Decimal @param hexval Expects an array (or string) of hex
 * digits
 */
function hexToDec(hexval) {

    if (hexval.length > 2) {
        // strip 0x
        if (hexval.slice(0, 2) === "0x") {
            hexval = hexval.slice(2);
        }
    }

    var decimal = 0;
    var p16 = 0;
    for ( var i = 0; i < hexval.length; ++i) {
        // Traversing string from left to right
        // (in decreasing order of magnitude)
        // Get the power of 16 value for this hex digit
        p16 = Math.pow(16, (hexval.length - 1) - i);

        // Convert the hex value to its decimal equivalent and then multiply by
        // the appropriate power of 16
        decimal += (HEXTODEC_TABLE[hexval[i]] * p16);
    }

    return decimal;
}

/*
 * Convert Decimal to Hex
 * 
 * @param decval Expects an integer
 */
function decToHex(decval) {
    // Only do work if decval is != 0
    if (decval != 0) {

        var hex = "";
        // Log16 of value gives the largest power of 16 contained in it
        // No log16 method, so need to transform
        var max_p16 = Math.floor(Math.log(decval) / Math.log(16));

        // Stores the power of 16 to divide out
        var p16 = 0;

        // Stores the unconverted divided out power
        var hexAsDec = 0;

        for ( var i = 0; i <= max_p16; ++i) {

            p16 = Math.pow(16, (max_p16 - i));
            hexAsDec = Math.floor(decval / p16);

            hex += DECTOHEX_TABLE[hexAsDec];

            decval = decval % p16;
        }
    } else {
        hex = "00";
    }

    return hex;
}

const
HEXTODEC_TABLE = {
    0 : 0,
    1 : 1,
    2 : 2,
    3 : 3,
    4 : 4,
    5 : 5,
    6 : 6,
    7 : 7,
    8 : 8,
    9 : 9,
    A : 10,
    B : 11,
    C : 12,
    D : 13,
    E : 14,
    F : 15
};

const
DECTOHEX_TABLE = {
    0 : "0",
    1 : "1",
    2 : "2",
    3 : "3",
    4 : "4",
    5 : "5",
    6 : "6",
    7 : "7",
    8 : "8",
    9 : "9",
    10 : 'A',
    11 : 'B',
    12 : 'C',
    13 : 'D',
    14 : 'E',
    15 : 'F'
};
