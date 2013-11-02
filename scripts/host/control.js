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

window.onload = function() {
    // Get the ball rolling
    _HOST = new Host();
};
/**
 * Get the base hardware interfaces set up
 */
function Host() {
    this.screens = [];
    this.screens[this.screens.length] = document.getElementById('display');
    this.screens[this.screens.length] = document.getElementById('status');

    this.contexts = [];
    // Get a global reference to the drawing context.
    this.contexts[this.contexts.length] = this.screens[this.contexts.length]
            .getContext('2d');
    this.contexts[this.contexts.length] = this.screens[this.contexts.length]
            .getContext('2d');

    // ... Create and initialize the CPU ...
    var host = this;
    // CPU Display update function
    var cpu_displayer = function() {
        host.updateCPUDisplay();
    };
    this.CPU = new CPU(cpu_displayer);

    // Create memory
    // Memory display function
    var mem_displayer = function(col, row, data) {
        host.updateMemDisplay(col, row, data);
    };
    this.memory = new Memory(mem_displayer);
    this.kernel = undefined;

    this.clock = 0;
    this.hardwareClockID = -1;

    // Complete the memory display
    this.genMemoryTable();

    // Clear the log text box.
    document.getElementById("taLog").value = "";

    // Set focus on the start button.
    document.getElementById("btnStartOS").focus();

    // Check for our testing and enrichment core.
    if (typeof Glados === "function") {
        _GLaDOS = new Glados();
        _GLaDOS.init();
    }
}

// Control Events
Host.prototype.startOS = function(btn) {
    // Disable the start button...
    btn.disabled = true;

    // .. enable the Halt and Reset buttons ...
    document.getElementById("btnHaltOS").disabled = false;
    document.getElementById("btnReset").disabled = false;

    // Make our faux loading screen
    var waitTime = 2300; // how long the 'boot' takes
    // (2300 is ~= 1 full animation of the boot gif)

    var ldScrNode = document.getElementById('display');

    var img = document.createElement('img');
    img.id = 'bootimg';
    img.src = 'images/boot.gif';
    img.height = 500;
    img.width = 500;

    document.getElementById('divConsole').replaceChild(img, ldScrNode);

    window.setTimeout(function() {
        document.getElementById('divConsole').replaceChild(ldScrNode, img);
    }, waitTime);

    var loadComplete = function(host) {
        // .. set focus on the OS console display ...
        document.getElementById("display").focus();

        host.kernel = new Kernel(host);
        // ... then set the host clock pulse ...
        host.hardwareClockID = setInterval(function() {
            host.clockPulse();
        }, CPU_CLOCK_INTERVAL);
    };

    // .. and call the OS Kernel Bootstrap routine.
    window.setTimeout(loadComplete, waitTime, this);
};

Host.prototype.log = function(msg, source) {
    // Check the source.
    if (!source) {
        source = "?";
    }

    // Note the REAL clock in milliseconds since January 1, 1970.
    var now = new Date().getTime();

    // Build the log string.
    var str = "({ clock:" + this.clock + ", source:" + source + ", msg:" + msg
            + ", now:" + now + " })" + "\n";

    // Update the log console.
    var taLog = document.getElementById("taLog");
    taLog.value = str + taLog.value;
    // Optionally update a log database or some streaming service.
};

Host.prototype.haltOS = function() {
    this.log("emergency halt", "host");
    this.log("Attempting Kernel shutdown.", "host");
    // Call the OS shutdown routine.
    this.kernel.shutdown();
    // Stop the JavaScript interval that's simulating our clock pulse.
    clearInterval(this.hardwareClockID);
    // TODO: Is there anything else we need to do here?
};

Host.prototype.RESET = function() {
    // The easiest and most thorough way to do this is to reload (not refresh)
    // the document.
    location.reload(true);
    // That boolean parameter is the 'forceget' flag. When it is true it causes
    // the page to always
    // be reloaded from the server. If it is false or not specified, the browser
    // may reload the
    // page from its cache, which is not what we want.
};

/*
 * Complete the memory table html element
 */
Host.prototype.genMemoryTable = function() {
    var width = this.memory.BLOCK_SIZE;
    var height = this.memory.SIZE / width;
    var block = -1;

    var tblBody = document.createElement("tbody");
    var tr, td;
    var rowLbl;

    for ( var i = 0; i < height; ++i) {

        // Add in memory block separators
        var cblock = Math.floor(i * this.memory.BLOCK_SIZE / 255);

        if (cblock > block) {
            tr = document.createElement("tr");
            td = document.createElement("td");
            td.appendChild(document.createTextNode("Block: "
                    + decToHex(cblock * 256) + " - "
                    + decToHex(((cblock + 1) * 256) - 1)));

            tr.appendChild(td);
            tblBody.appendChild(tr);

            block = cblock;
        }

        tr = document.createElement("tr");
        tr.setAttribute("id", "tr" + i);

        // create row label
        td = document.createElement("td");

        // row starts at BLOCK_SIZE * number of rows
        rowLbl = this.memory.BLOCK_SIZE * i;

        rowLbl = decToHex(rowLbl);
        td.appendChild(document.createTextNode("0x" + rowLbl));

        tr.appendChild(td);

        for ( var j = 1; j <= width; ++j) {
            // Make memory cell
            td = document.createElement("td");
            td.setAttribute("id", "tdr" + i + "c" + j);

            td.appendChild(document.createTextNode("00"));

            tr.appendChild(td);
        }

        tblBody.appendChild(tr);
    }

    document.getElementById("memory").appendChild(tblBody);
};

/*
 * Update memory display
 */
Host.prototype.updateMemDisplay = function(col, row, data) {
    var cellId = "tdr" + col + "c" + (row + 1);

    var del = document.getElementById(cellId).childNodes[0];
    var dat = document.createTextNode(data);

    document.getElementById(cellId).replaceChild(dat, del);
};

/*
 * Update CPU display
 */
// Update HTML element display for cpu
Host.prototype.updateCPUDisplay = function() {
    document.getElementById("PC1").innerHTML = "0x" + decToHex(this.CPU.PC);
    document.getElementById("ACC1").innerHTML = "0x" + decToHex(this.CPU.Acc);
    document.getElementById("XReg1").innerHTML = "0x" + decToHex(this.CPU.Xreg);
    document.getElementById("YReg1").innerHTML = "0x" + decToHex(this.CPU.Yreg);
    document.getElementById("ZFlag1").innerHTML = "0x"
            + decToHex(this.CPU.Zflag);
};

//
// Hardware/Host Clock Pulse
//
Host.prototype.clockPulse = function() {
    // Increment the hardware (host) clock.
    this.clock++;
    // Call the kernel clock pulse event handler.
    this.kernel.onCPUClockPulse();
};

Host.prototype.updateRQDisplay = function() {
    var table = document.createElement("tbody");
    var tr_sub_ids = [ "state", "pc", "acc", "xreg", "yreg", "zflag", "malloc",
            "iostat" ];

    // TODO Ask PCB for this function
    // Returns an array of strings to populate in table data
    var createDisplayStrings = function(pcb) {
        var ret = [];
        ret.push("State: " + pcb.state);
        ret.push("CPU_PC: " + pcb.PC);
        ret.push("CPU_Acc: " + pcb.Acc);
        ret.push("CPU_Xreg: " + pcb.Xreg);
        ret.push("CPU_Yreg: " + pcb.Yreg);
        ret.push("CPU_Zflag: " + pcb.Zflag);
        ret.push("Malloc'd: " + pcb.memLimit);
        ret.push("I/O wait: " + pcb.IOWait);

        return ret;
    };
    if (this.kernel.readyQueue.getSize() == 0) {
        // if the readyqueue is empty
        table.innerHTML = "<tr><td>No waiting processes</td></tr>";
    } else {
        // fill out the table with data
        var tr;
        var attr;
        var td;
        var pcb;

        for ( var i = 0; i < this.kernel.readyQueue.getSize(); ++i) {
            pcb = this.kernel.loadedProcesses[this.kernel.readyQueue.q[i]];
            // Make a new table row
            tr = document.createElement("tr");
            // Set the name to == PID
            tr.setAttribute("id", "pid" + pcb.PID);
            // Set the name row
            td = document.createElement("td");
            td.setAttribute("id", "pname" + pcb.PID);
            td.appendChild(document.createTextNode("Process " + pcb.PID));
            tr.appendChild(td);

            table.appendChild(tr);

            // get attributes
            attr = createDisplayStrings(pcb);

            // Generate attribute rows
            for ( var j = 0; j < attr.length; ++j) {
                tr = document.createElement("tr");
                // Generate a unique id
                tr.setAttribute("id", "p" + tr_sub_ids[j] + pcb.PID);
                // Set up data node
                td = document.createElement("td");
                // Set its data to display the attribute
                td.appendChild(document.createTextNode(attr[j]));

                tr.appendChild(td);
                table.appendChild(tr);
            }
        }
    }

    document.getElementById("RQ").innerHTML = "";
    document.getElementById("RQ").appendChild(table);
};

//
// Keyboard Interrupt, a HARDWARE Interrupt Request. (See pages 560-561 in text
// book.)
//
Host.prototype.enableKeyboardInterrupt = function() {
    // Listen for key press (keydown, actually) events in the Document
    // and call the simulation processor, which will in turn call the
    // OS interrupt handler.
    document.addEventListener("keydown", onKeypress, false);
};

Host.prototype.disableKeyboardInterrupt = function() {
    document.removeEventListener("keydown", onKeypress, false);
};

function onKeypress(event) {
    // The canvas element CAN receive focus if you give it a tab index, which we
    // have.
    // Check that we are processing keystrokes only from the canvas's id (as set
    // in index.html).
    if (event.target.id === "display") {
        event.preventDefault();
        // Note the pressed key code in the params (Mozilla-specific).
        var params = new Array(event.which, event.shiftKey);
        // Enqueue this interrupt on the kernel interrupt queue so that it gets
        // to the Interrupt handler.
        _HOST.kernel.queueInterrupt(_HOST.kernel.KEYBOARD_IRQ, params);
    }
};
