/* ------------
   Kernel.js

   Requires globals.js

   Routines for the Operating System, NOT the host.

   This code references page numbers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */



//OS Startup and Shutdown Routines   

function krnBootstrap()      // Page 8.
{
    hostLog("bootstrap", "host");  // Use hostLog because we ALWAYS want this, even if _Trace is off.

    // Initialize our global queues.
    _KernelInterruptQueue = new Queue();  // A (currently) non-priority queue for interrupt requests (IRQs).

    // handles timout functions
    var TimedComparator = function(a, b) {
        return a.timeLeft == b.timeLeft ? 0 : a.timeLeft < b.timeLeft ? -1 : 1;
    };
    _KernelTimedEvents = new MinHeap(null, TimedComparator); 

    _KernelBuffers = new Array();         // Buffers... for the kernel.
    _KernelInputQueue = new Queue();      // Where device input lands before being processed out somewhere.
    _Console = new CLIconsole(CONSOLE_CANVASID); // The command line interface / console I/O device.
    //    tell it to draw to canvas 0, the console canvas
    _StatusBar = new StatusBar(STATUS_CANVASID);

    // Initialize the CLIconsole.
    _Console.init();
    _StatusBar.init(new Date());

    // Initialize standard input and output to the _Console.
    _StdIn  = _Console;
    _StdOut = _Console;

    //setting up interrupt handlers
    this.krnInterruptVector = [];

    //timer into Interrupt Vector
    this.krnInterruptVector[TIMER_IRQ] = function (params) {
        krnTimerISR(params); // Kernel built-in routine for timers (not the clock).
    };

    // Load the Keyboard Device Driver
    krnTrace("Loading the keyboard device driver.");
    krnKeyboardDriver = new DeviceDriverKeyboard();     // Construct it.  
    // TODO: Should that have a _global-style name?
    krnKeyboardDriver.driverEntry();                    // Call the driverEntry() initialization routine.
    krnTrace(krnKeyboardDriver.status);

    this.krnInterruptVector[KEYBOARD_IRQ] = function (params) {
        krnKeyboardDriver.isr(params);   // Kernel mode device driver
        _StdIn.handleInput();
    };

    //load the Display Device Driver
    krnTrace("Loading the display driver");
    krnDisplayDriver = new DeviceDriverDisplay();
    krnDisplayDriver.driverEntry();
    krnTrace(krnDisplayDriver.status);

    this.krnInterruptVector[DISPLAY_IRQ] = function (params) {
        krnDisplayDriver.isr(params);
    };
    
    //Software system call handlers
    krnTrace("Loading SYS handlers");
    this.krnInterruptVector[SYS_IRQ] = function (params) {
        console.log("SYS CALL");
        console.log("  x: " + _CPU.Xreg);
        console.log("  y: " + _CPU.Yreg);
        
        //XREG == 1, print integer
        if(_CPU.Xreg == 1) {
            _StdOut.putText("" + _CPU.Yreg);
        }
        //XREG == 2, print string null terminated
        else if(_CPU.Xreg == 2) {
            //get ASCII data starting at Yreg
            var data = [];
            var i = _CPU.Yreg;
            var byte = hexToDec(_MMU.read(i++));
            
            //read until nul byte or MEM ACCESS VIOLATION
            while(byte != "00") {
                data[data.length] = byte;
                byte = hexToDec(_MMU.read(i++));
            }
            
            //translate from ascii values to string
            var str = "";
            for(i = 0; i < data.length; ++i) {
                str += String.fromCharCode(data[i]);
            }
            
            _StdOut.putText(str);
        }
        else {
            _KernelInterruptQueue.enqueue(new Interrupt(SW_FATAL_IRQ, [2]));
        }
        
    };
    
    //Software violation handlers
    this.krnInterruptVector[SW_FATAL_IRQ] = function(params) {
        _StdOut.putText("process: " + _KernelCurrentProcess.PID + " fatal exception");
        _StdOut.advanceLine();
        
        if(params[0] == 0) {
            //Invalid opcode
            _StdOut.putText("Invalid opcode at byte: " + _CPU.PC);
        }
        else if(params[0] == 1) {
            //Memory access violation
            _StdOut.putText("Memory access violation");
        }
        else if(params[0] == 2) {
            //Bad SYS call
            _StdOut.putText("Bad SYS Opcode");
        }

        _StdOut.advanceLine();
        _StdOut.putText(_OsShell.promptStr);

        _KernelCurrentProcess.state = 'failed';
        _CPU.isExecuting = false;
    };
    
    //Loading program exit handler
    this.krnInterruptVector[PROG_EXIT] = function() {
        //TODO: Add scheduler stuff
        _StdOut.advanceLine();
        _StdOut.putText("Program: " + _KernelCurrentProcess.PID + " - Complete");
        
        _KernelCurrentProcess.state = "done";
        _KernelCurrentProcess.synchronize();
        
        //Display PCB
        _StdOut.advanceLine();
        _StdOut.putText("PCB:");
        _StdOut.advanceLine();
        _StdOut.putText("         PID: " + _KernelCurrentProcess.PID);
        _StdOut.advanceLine();
        _StdOut.putText("          PC: " + decToHex(_KernelCurrentProcess.PC));
        _StdOut.advanceLine();
        _StdOut.putText("         ACC: " + decToHex(_KernelCurrentProcess.Acc));
        _StdOut.advanceLine();
        _StdOut.putText("        Xreg: " + decToHex(_KernelCurrentProcess.Xreg));
        _StdOut.advanceLine();
        _StdOut.putText("        Yreg: " + decToHex(_KernelCurrentProcess.Yreg));
        _StdOut.advanceLine();
        _StdOut.putText("       Zflag: " + decToHex(_KernelCurrentProcess.Zflag));
        _StdOut.advanceLine();
        _StdOut.putText("       state: " + _KernelCurrentProcess.state);
        _StdOut.advanceLine();
        _StdOut.putText("    baseaddr: " + _KernelCurrentProcess.memStart);
        _StdOut.advanceLine();
        _StdOut.putText("  Mem allocd: " + _KernelCurrentProcess.memLimit);
        _StdOut.advanceLine();
        _StdOut.putText(_OsShell.promptStr);
        
        //Disable step button on program exit if it was being stepped through
        if(!document.getElementById('btnStep').disabled) {
            document.getElementById('btnStep').disabled = true;
        }
        
        _CPU.isExecuting = false;
    };
    
    //Handle program stepping
    this.krnInterruptVector[PROG_STEP] = function(args) {
        //Simplesimple
        _CPU.cycle();
    };
    
    //Loads the memory management unit
    krnTrace("Loading MMU");
    _MMU = new MMU();
    _MMU.init();
    
    _KernelLoadedProcesses = [];

    // Enable the OS Interrupts.  (Not the CPU clock interrupt, as that is done in the hardware sim.)
    krnTrace("Enabling the interrupts.");
    krnEnableInterrupts();

    // Launch the shell.
    krnTrace("Creating and Launching the shell.");
    _OsShell = new Shell();
    _OsShell.init();

    // Finally, initiate testing.
    if (_GLaDOS) {
        _GLaDOS.afterStartup();
    }
}

function krnShutdown()
{
    krnTrace("begin shutdown OS");
    // TODO: Check for running processes.  Alert if there are some, alert and stop.  Else...    
    // ... Disable the Interrupts.
    krnTrace("Disabling the interrupts.");
    krnDisableInterrupts();

    // 
    // Unload the Device Drivers?
    // More?
    //

    krnTrace("end shutdown OS");

    clearInterval(_hardwareClockID);
}


function krnOnCPUClockPulse() 
{
    /* This gets called from the host hardware sim every time there is a hardware clock pulse.
       This is NOT the same as a TIMER, which causes an interrupt and is handled like other interrupts.
       This, on the other hand, is the clock pulse from the hardware (or host) that tells the kernel 
       that it has to look for interrupts and process them if it finds any.                           */
    if (_KernelTimedEvents.size() > 0) {
        //decrease time
        _KernelTimedEvents.decrement(CPU_CLOCK_INTERVAL);
    }

    // Check for an interrupt, are any. Page 560
    if (_KernelInterruptQueue.getSize() > 0) {
        // Process the first interrupt on the interrupt queue.
        // TODO: Implement a priority queue based on the IRQ number/id to enforce interrupt priority.
        var interrupt = _KernelInterruptQueue.dequeue();
        krnInterruptHandler(interrupt.irq, interrupt.params);
    }
    //handle timed events
    else if(_KernelTimedEvents.getMin().timeLeft <= 0) {
        _KernelInterruptQueue.enqueue(_KernelTimedEvents.pop().interrupt);
    }
    // If there are no interrupts then run one CPU cycle if there is anything being processed.
    else if (_CPU.isExecuting) {
        _CPU.cycle();
    }
    // If there are no interrupts and there is
    //   nothing being executed then just be idle.
    else {
        krnTrace("Idle");
    }
}

//Interrupt Handling

function krnEnableInterrupts()
{
    // Keyboard
    hostEnableKeyboardInterrupt();
    // Put more here.
}

function krnDisableInterrupts()
{
    // Keyboard
    hostDisableKeyboardInterrupt();
    // Put more here.
}

function krnInterruptHandler(irq, params)    // This is the Interrupt Handler Routine.  Pages 8 and 560.
{
    // Trace our entrance here so we can compute Interrupt Latency by analyzing the log file later on.
    //  Page 766.
    krnTrace("Handling IRQ~" + irq);

    // Invoke the requested Interrupt Service Routine via Switch/Case rather than an Interrupt Vector.
    // Note: There is no need to "dismiss" or acknowledge the interrupts in our design here.  
    //       Maybe the hardware simulation will grow to support/require that in the future.
    if(irq >= 0 && irq < this.krnInterruptVector.length) {
        //handle interrupt
        this.krnInterruptVector[irq](params);
    }
    else {
        krnTrapError("Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]");
    }
}

function krnTimerISR(params)  // The built-in TIMER (not clock) Interrupt Service Routine 
//(as opposed to an ISR coming from a device driver).
{
    // Check multiprogramming parameters and enforce quanta here. 
    //  Call the scheduler / context switch here if necessary.

    //Kernel can do more important things in the future, for now just execute timer events
    if(params.length == 2) {
        if(DEBUG == true) {
            console.log("executing timed: " + params);
        }
        params[1].call(params[0], new Date());
    }
}   

//System Calls... that generate software interrupts via tha Application Programming
//Interface library routines.

//Some ideas:
//- ReadConsole
//- WriteConsole
//- CreateProcess
//- ExitProcess
//- WaitForProcessToExit
//- CreateFile
//- OpenFile
//- ReadFile
//- WriteFile
//- CloseFile

//Steps program execution
function kernelStep() {
    //Registers an interrupt to execute one cycle of the program
    _KernelInterruptQueue.enqueue(new Interrupt(PROG_STEP, []));
}

//OS Utility Routines

function krnTrace(msg)
{
    // Check globals to see if trace is set ON.  If so, then (maybe) log the message. 
    if (_Trace)
    {
        if (msg === "Idle")
        {
            // We can't log every idle clock pulse because it would lag the browser very quickly.
            if (_OSclock % (1000 / CPU_CLOCK_INTERVAL) == 0)  // Check the CPU_CLOCK_INTERVAL in globals.js for an 
            {                        // idea of the tick rate and adjust this line accordingly.
                hostLog(msg, "OS");
            }         
        }
        else
        {
            hostLog(msg, "OS");
        }
    }
}

function krnTrapError(msg)
{
    hostLog("OS ERROR - TRAP: " + msg);

    var textOut = function(str) {

        var context = _DrawingContexts[CONSOLE_CANVASID];

        context.strokeStyle = 'black';
        context.fillStyle = 'white';
        context.font = "18px Courier";

        var wid = context.measureText(str).width;
        var xs = _Canvases[CONSOLE_CANVASID].width / 2 - wid / 2;
        var ys = _Canvases[CONSOLE_CANVASID].height / 2;

        context.strokeText(str, xs, ys);
        context.fillText(str, xs, ys);
        
    };

    if(msg == "BSOD") {
        var crashImg = new Image();

        crashImg.onload = function () {
            _DrawingContexts[CONSOLE_CANVASID].drawImage(crashImg, 0, 0
                    , _Canvases[CONSOLE_CANVASID].width
                    , _Canvases[CONSOLE_CANVASID].height);

            var str = "Your system's dead, there's something wrong";

            textOut(str);
        };

        //originally from 
        //  http://www.fanpop.com/clubs/david-bowie/images/348938/title/bowie-wallpaper
        crashImg.src = 'images/bowiesd.jpg';
    }
    else {

        var str = "SYSTEM ERROR : " + msg + " : CHECK FOR DOS";

        var width = _Canvases[CONSOLE_CANVASID].width;
        var height = _Canvases[CONSOLE_CANVASID].height;

        var cw, ch, nw, nh;
        var blue = true;

        _DrawingContexts[CONSOLE_CANVASID].fillStyle = 'blue';

        for(ch = 0; ch < height; ch += nh) {
            nh = (2 + Math.floor(Math.random() * 5));

            for(cw = 0; cw < width; cw += nw) {
                nw = (2 + Math.floor(Math.random() * 5));

                _DrawingContexts[CONSOLE_CANVASID].fillRect(cw, ch, nw, nh);

                if(blue) {
                    _DrawingContexts[CONSOLE_CANVASID].fillStyle = 'grey';
                } 
                else {
                    _DrawingContexts[CONSOLE_CANVASID].fillStyle = 'blue';
                }
                blue = !blue;

            }//end by width fill
        }//end by height fill

        textOut(str);
    }//end BSOD else

    krnShutdown();
}
