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

// GLaDOS still looks at these
var _KernelInputQueue = null;
var krnInterruptHandler = null;

// At least this OS is not trying to kill you. (Yet.)
var _SarcasticMode = false;

// For testing...
var _GLaDOS = null;

const
HEXTODEC_TABLE =
{
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
DECTOHEX_TABLE =
{
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
