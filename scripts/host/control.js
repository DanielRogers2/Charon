/* ------------  
   Control.js

   Requires global.js.

   Routines for the hardware simulation, NOT for our client OS itself. In this manner, it's A LITTLE BIT like a hypervisor,
   in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code that
   hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using JavaScript in 
   both the host and client environments.

   This (and other host/simulation scripts) is the only place that we should see "web" code, like 
   DOM manipulation and JavaScript event handling, and so on.  (Index.html is the only place for markup.)

   This code references page numbers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

//Control Services
function hostInit() {
    _Canvases = [];
    _Canvases[_Canvases.length] = document.getElementById('display');
    _Canvases[_Canvases.length] = document.getElementById('status');

    _DrawingContexts = [];
    // Get a global reference to the drawing context.
    _DrawingContexts[_DrawingContexts.length] = _Canvases[_DrawingContexts.length]
    .getContext('2d');
    _DrawingContexts[_DrawingContexts.length] = _Canvases[_DrawingContexts.length]
    .getContext('2d');

    //Complete the memory table
    genMemoryTable();

    /*
     * _DrawingContext = _Canvas.getContext('2d'); _StatusBarContext =
     * _StatusBar.getContext('2d');
     *  // Using HTML5 text functions _DrawingContext.font = _DefaultFontFamily;
     * _StatusBarContext.font = _DefaultFontFamily;
     */

    // Clear the log text box.
    document.getElementById("taLog").value = "";

    // Set focus on the start button.
    document.getElementById("btnStartOS").focus();

    // Check for our testing and enrichment core.
    if (typeof Glados === "function") {
        _GLaDOS = new Glados();
        _GLaDOS.init();
    };

}

function hostLog(msg, source) {
    // Check the source.
    if (!source) {
        source = "?";
    }

    // Note the OS CLOCK.
    var clock = _OSclock;

    // Note the REAL clock in milliseconds since January 1, 1970.
    var now = new Date().getTime();

    // Build the log string.
    var str = "({ clock:" + clock + ", source:" + source + ", msg:" + msg
    + ", now:" + now + " })" + "\n";

    // Update the log console.
    var taLog = document.getElementById("taLog");
    taLog.value = str + taLog.value;
    // Optionally update a log database or some streaming service.
}

//Control Events

function hostBtnStartOS_click(btn) {
    // Disable the start button...
    btn.disabled = true;

    // .. enable the Halt and Reset buttons ...
    document.getElementById("btnHaltOS").disabled = false;
    document.getElementById("btnReset").disabled = false;

    // ... Create and initialize the CPU ...
    _CPU = new Cpu();
    _CPU.init();

    // Create memory
    _MEMORY = new Memory();
    _MEMORY.init();


    //Make our faux loading screen
    var waitTime = 2300;    //how long the 'boot' takes 
    // (2300 is ~= 1 full animation of the boot gif)

    var ldScrNode = document.getElementById('display');

    var img = document.createElement('img');
    img.id = 'bootimg';
    img.src = 'images/boot.gif';
    img.height = 500;
    img.width = 500;

    document.getElementById('divConsole').replaceChild(img, ldScrNode);

    window.setTimeout(function () {
        document.getElementById('divConsole').replaceChild(ldScrNode, img);
    }, waitTime);

    var loadComplete = function () {
        // .. set focus on the OS console display ...
        document.getElementById("display").focus();

        // ... then set the host clock pulse ...
        _hardwareClockID = setInterval(hostClockPulse, CPU_CLOCK_INTERVAL);
        krnBootstrap();
    };

    // .. and call the OS Kernel Bootstrap routine.
    window.setTimeout(loadComplete, waitTime);
}

function hostBtnHaltOS_click(btn) {
    hostLog("emergency halt", "host");
    hostLog("Attempting Kernel shutdown.", "host");
    // Call the OS shutdown routine.
    krnShutdown();
    // Stop the JavaScript interval that's simulating our clock pulse.
    clearInterval(_hardwareClockID);
    // TODO: Is there anything else we need to do here?
}

function hostBtnReset_click(btn) {
    // The easiest and most thorough way to do this is to reload (not refresh)
    // the document.
    location.reload(true);
    // That boolean parameter is the 'forceget' flag. When it is true it causes
    // the page to always
    // be reloaded from the server. If it is false or not specified, the browser
    // may reload the
    // page from its cache, which is not what we want.
}

/*
 * Complete the memory table html element
 */
function genMemoryTable() {
    var mem = new Memory();
    var width = mem.BLOCK_SIZE;
    var height = mem.SIZE / width;
    var block = -1;

    var tblBody = document.createElement("tbody");
    var tr, td;
    var rowLbl;

    for(var i = 0; i < height; ++i) {

        //Add in memory block separators
        var cblock = Math.floor(i * mem.BLOCK_SIZE / 255);
        
        if(cblock > block) {
            tr = document.createElement("tr");
            td = document.createElement("td");
            td.appendChild(document 
                    .createTextNode("Block: " + decToHex(cblock * 256)
                            + " - " + decToHex( ( (cblock + 1) * 256) - 1 ) ) );

            tr.appendChild(td);
            tblBody.appendChild(tr);
            
            block = cblock;
        }

        tr = document.createElement("tr");
        tr.setAttribute("id", "tr"+i);

        //create row label
        td = document.createElement("td");

        //row starts at BLOCK_SIZE * number of rows
        rowLbl = mem.BLOCK_SIZE * i;

        rowLbl = decToHex(rowLbl);
        td.appendChild(document.createTextNode("0x" + rowLbl));

        tr.appendChild(td);

        for(var j = 1; j <= width; ++j) {
            //Make memory cell
            td = document.createElement("td");
            td.setAttribute("id", "tdr" + i + "c" + j);

            td.appendChild(document.createTextNode("00"));

            tr.appendChild(td);
        }

        tblBody.appendChild(tr);
    }

    document.getElementById("memory").appendChild(tblBody);

}
