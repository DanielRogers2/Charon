/* ------------
   Kernel.js

   Requires globals.js

   Routines for the Operating System, NOT the host.

   This code references page numbers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

//OS Startup and Shutdown Routines   
/**
 * Generates a new kernel instance
 * 
 * @param host
 *            The host hardware simulation
 */
// Page 8.
function Kernel(host) {
    // Our constant Defines for IRQ
    // Pages 23 (timer), 9 (interrupts), and 561 (interrupt
    // priority).
    // NOTE: The timer is different from hardware/host clock pulses. Don't
    // confuse
    // these.
    this.TIMER_IRQ = 0;
    this.KEYBOARD_IRQ = 1;
    this.DISPLAY_IRQ = 2;
    // handles SW system calls, ask CPU for value
    this.SYS_IRQ = host.CPU.SYS_CALL_IRQ;
    // Software Fatal exception
    // 0 = bad opcode, from CPU
    // 1 = memory access violation
    // 2 = bad SYS call
    this.SW_FATAL_IRQ = host.CPU.SW_FATAL_IRQ;
    // program complete
    this.PROG_EXIT = host.CPU.PROG_EXIT_IRQ;
    // program step
    this.PROG_STEP = 6;
    // Handler for set CPU timers for scheduling & etc
    this.CPU_TIMER_IRQ = host.CPU.TIMER_IRQ;
    // Handles context switches
    this.CTXT_SWITCH_IRQ = 8;

    // Canvases for drawing
    this.CONSOLE_CID = 0;
    this.STATUS_CID = 1;

    // Set up our hardware connections
    this.CPU = host.CPU;

    // javascript needs to /die/
    var kernel = this;

    // No processes yet
    this.nextPID = 0;

    this.memory = host.memory;
    this.host = host;

    // Use hostLog because we ALWAYS want this, even if _Trace is off.
    this.host.log("bootstrap", "host");

    // Who is responsible for messing things up
    this.activeProcess = undefined;

    // Initialization of internal state
    // Interrupt queue, Using golf IQ instead of normal IQ
    this.IQ = new Queue();

    // Queue for timed events, part of the 'TEQ' that sets this apart
    var TimedComparator = function(a, b) {
        return (a.timeLeft === b.timeLeft) ? 0 : (a.timeLeft < b.timeLeft) ? -1
                : 1;
    };
    this.TEQ = new MinHeap(null, TimedComparator);

    // Padding to protect our insides from caveman clubs
    this.inputQ = new Queue();

    // If users are allowed to give input, might as well do something with it
    this.console = new CLIconsole(this, this.CONSOLE_CID);
    this.stdIn = this.console;
    this.stdOut = this.console;

    // Promoting dynamism through asynchronus timekeeping functions with added
    // synergy via status message updates
    this.statusBar = new StatusBar(this, this.STATUS_CID);

    // Polling is bad. We're god - democracy just makes things slower.
    // Dictatorship is our life blood
    this.IV = {};

    // Load the timed events driver
    this.trace("Loading Timers");
    // Kernel built-in routine for timers (not the clock)
    this.IV[this.TIMER_IRQ] = function(params) {
        kernel.timerISR(params);
    };

    // Load the Keyboard Device Driver
    this.trace("Loading the keyboard device driver.");
    // Generate a new driver
    this.keyboardDriver = new DeviceDriverKeyboard(this);
    this.keyboardDriver.driverEntry();

    this.trace(this.keyboardDriver.status);
    // Set it as the keyboard interrupt handler
    this.IV[this.KEYBOARD_IRQ] = function(params) {
        kernel.keyboardDriver.isr(params);
        kernel.stdIn.handleInput();
    };

    // load the Display Device Driver
    this.trace("Loading the display driver");
    this.displayDriver = new DeviceDriverDisplay(this);
    this.displayDriver.driverEntry();

    this.trace(this.displayDriver.status);
    this.IV[this.DISPLAY_IRQ] = function(params) {
        kernel.displayDriver.isr(params);
    };

    // Software system call handlers
    this.trace("Loading SYS handlers");
    this.IV[this.SYS_IRQ] = function(params) {
        kernel.sysCallHandler();
    };

    this.trace("Loading User Software handlers");
    // Software violation handlers
    this.IV[this.SW_FATAL_IRQ] = function(params) {
        kernel.swExceptionHandler(params);
    };

    // Loading program exit handler
    this.IV[this.PROG_EXIT] = function(params) {
        kernel.programCleanup();
    };

    // Handle program stepping
    this.IV[this.PROG_STEP] = function(params) {
        kernel.CPU.cycle();
    };

    // Loads the memory management unit
    this.trace("Loading MMU");
    // Function to handle memory access violations
    var mem_acc_viol_handlr = function(pid) {
        // Queue a fatal interrupt, indicate that it was fatal
        kernel.queueInterrupt(kernel.SW_FATAL_IRQ, [ 1, pid ]);
    };
    // Function to get process control blocks for the MMU
    var pcb_lookp = function(pid) {
        if (pid === undefined) {
            return kernel.activeProcess;
        } else {
            return kernel.loadedProcesses[pid];
        }
    };

    this.MMU = new MMU(mem_acc_viol_handlr, pcb_lookp, this.memory);

    // Do something for somehow where?
    this.buffers = new Array();

    // Processes loaded into memory -- the resident queue
    this.loadedProcesses = {};
    // The ready queue
    this.readyQueue = new Queue();
    // Set up a new short-term scheduler
    this.shortTermSched = new STS(this);

    this.trace("Setting up the short term scheduler");
    this.IV[this.CPU_TIMER_IRQ] = function(params) {
        kernel.trace("Scheduling decision");
        // Need to make a scheduling decision
        kernel.shortTermSched.decide();
    };

    this.trace("Setting up context switch handling");
    this.IV[this.CTXT_SWITCH_IRQ] = function(params) {
        // Params == pcb to load
        // Sanity check
        if (params[0] in kernel.loadedProcesses) {
            if (kernel.activeProcess) {
                // Save the active process
                kernel.activeProcess.synchronize();
                // Update its state
                kernel.activeProcess.state = 'ready';
                // Move it onto the back of the ready queue
                kernel.readyQueue.enqueue(kernel.activeProcess.PID);
            }

            // Load the new registers
            var proc = kernel.loadedProcesses[params[0]];
            proc.load();
            // Update the active process
            kernel.activeProcess = proc;
            kernel.activeProcess.state = 'running';

            if (!kernel.CPU.isExecuting)
                kernel.CPU.isExecuting = true;

            kernel.host.updateRQDisplay();
        }
    };

    this.trace("Connecting hardware interfaces");
    // Interrupt handler for the CPU
    var irq_handle = function(id, param) {
        if (param === undefined) {
            kernel.queueInterrupt(id, []);
        } else {
            // The CPU passes in a single value, wrap it in an array
            kernel.queueInterrupt(id, [ param ]);
        }
    };

    // Memory read handler for the CPU
    var read_handle = function(addr) {
        return kernel.MMU.read(addr);
    };

    // Memory write handler for the CPU
    var write_handle = function(addr, byte) {
        kernel.MMU.write(addr, byte);
    };

    // Tracing function for the CPU
    var tracer = function(msg) {
        kernel.trace(msg);
    };

    // Connect CPU interface
    this.CPU.hook(irq_handle, read_handle, write_handle, tracer);

    // Enable the OS Interrupts. (Not the CPU clock interrupt, as that is done
    // in the hardware sim.)
    this.trace("Enabling the interrupts.");
    this.enableInterrupts();

    // Launch the shell.
    this.trace("Creating and Launching the shell.");
    this.shell = new Shell(this);

    // Finally, initiate testing.
    if (_GLaDOS) {
        // Give GLaDOS access
        _KernelInputQueue = this.inputQ;
        krnInterruptHandler = this.interruptHandler;

        // Let her play
        _GLaDOS.afterStartup();
    }
}

/**
 * Outputs the string data contained at addr
 * 
 * @param addr
 *            The address in memory to read from
 */
Kernel.prototype.printStr = function(addr) {
    // get ASCII data starting at address
    var data = [];
    var i = addr;
    var byte = hexToDec(this.MMU.read(i++));

    // read until nul byte or MEM ACCESS VIOLATION
    while (byte != "00") {
        data[data.length] = byte;
        byte = hexToDec(this.MMU.read(i++));
    }

    // translate from ascii values to string
    var str = "";
    for (i = 0; i < data.length; ++i) {
        str += String.fromCharCode(data[i]);
    }

    this.stdOut.putText(str);
};

/**
 * Queues an interrupt for processing
 * 
 * @param ID
 *            The type of interrupt to queue
 * @param data
 *            The data to queue with the interrupt
 */
Kernel.prototype.queueInterrupt = function(ID, data) {
    this.IQ.enqueue(new Interrupt(ID, data));
};

/**
 * Queues a program for execution
 */
Kernel.prototype.queueProgram = function(pid) {

    if (this.readyQueue.q.indexOf(pid) > -1) {
        // Don't add twice in a row the same PID
        this.trace("Attempted double PID add");
        return;
    }

    // Get the process and update its status
    var process = this.loadedProcesses[pid];
    process.state = 'ready';

    if (!this.activeProcess) {
        // Set up the switch immediately if no programs loaded
        this.activeProcess = process;
        process.load();
        process.state = 'running';
        this.CPU.isExecuting = 'true';
    } else {
        // Put the program in the ready queue
        this.readyQueue.enqueue(pid);
        this.host.updateRQDisplay();
    }
};

/**
 * Sets up a timed event for processing later
 * 
 * @param callee
 *            The object to execute the function on
 * @param action
 *            The function to execute
 * @param timeout
 *            The amount of time to wait
 */
Kernel.prototype.addTimedEvent = function(callee, action, timeout) {
    var ir = new Interrupt(this.TIMER_IRQ, [ callee, action ]);
    var delayedEvent = new DelayedInterrupt(ir, timeout);

    this.TEQ.push(delayedEvent);
};

/**
 * Handles SYS call based on value of CPU X Register
 * 
 * X1: Print Integer in Y Register X2: Print null-terminated string starting @ Y
 * Register address
 */
Kernel.prototype.sysCallHandler = function() {
    if (DEBUG) {
        console.log("SYS CALL");
        console.log("  x: " + this.CPU.Xreg);
        console.log("  y: " + this.CPU.Yreg);
    }

    switch (this.CPU.Xreg) {
    case 1:
        // XREG == 1, print integer
        this.stdOut.putText("" + this.CPU.Yreg);
        break;

    case 2:
        // XREG == 2, print string null terminated
        this.printStr(this.CPU.Yreg);
        break;

    default:
        this.queueInterrupt(this.SW_FATAL_IRQ, [ 2 ]);
        break;
    }
};

/**
 * Handles exceptions resulting from program execution
 * 
 * @param params
 *            The parameters identifying the type of exception 0 == bad opcode 1 ==
 *            memory access violation 2 == bad SYS call An optional second
 *            parameter specifies the offending process id. If unspecified, the
 *            currently executing process will be killed.
 */
Kernel.prototype.swExceptionHandler = function(params) {

    var pid, error;
    // Extract the error arguments
    error = params[0];
    if (params.length > 1) {
        pid = params[1];
    } else {
        pid = this.activeProcess.pid;
    }

    this.stdOut.putText("process: " + pid + " fatal exception");
    this.stdOut.advanceLine();

    switch (error) {
    case 0:
        // Bad opcode
        this.stdOut.putText("Invalid opcode at byte: " + this.CPU.PC);
        break;

    case 1:
        // Memory access violation
        this.stdOut.putText("Memory access violation");
        break;

    case 2:
        // They asked to do something we don't let them do
        this.stdOut.putText("Bad SYS call");
        break;

    default:
        // Uh-oh
        this.trace("BAD EXCEPTION ERROR CODE");
        break;
    }

    this.stdOut.advanceLine();
    this.shell.prompt();

    // Kill it
    this.loadedProcesses[pid] = 'failed';
    this.freeProcess(pid);
};

/**
 * Prints data about a program's state post-exit and handles other tasks needed
 * at program exit.
 */
Kernel.prototype.programCleanup = function() {
    this.stdOut.advanceLine();
    this.stdOut.putText("Program: " + this.activeProcess.PID + " - Complete");
    this.stdOut.advanceLine();

    this.activeProcess.state = "done";
    this.activeProcess.synchronize();

    // Print out the state information
    this.activeProcess.display(this.stdOut);
    this.shell.prompt();

    // Disable step button on program exit if it was being stepped through
    if (!document.getElementById('btnStep').disabled) {
        document.getElementById('btnStep').disabled = true;
    }

    this.freeProcess(this.activeProcess.PID);
};

/**
 * Frees the resources used by the active process
 */
Kernel.prototype.freeProcess = function(pid) {
    if (!(pid in this.loadedProcesses)) {
        this.trace("bad PID free");
        return;
    }
    // Release the program's memory
    this.MMU.freeMem(this.loadedProcesses[pid],
            this.loadedProcesses[pid].memLimit);

    // Remove the process from the resident queue
    delete this.loadedProcesses[pid];

    var rindex = this.readyQueue.q.indexOf(pid);
    if (rindex > -1) {
        // Remove it from the ready queue
        this.readyQueue.q.splice(rindex, 1);
        this.host.updateRQDisplay();
    }

    if (this.activeProcess && (pid == this.activeProcess.PID)) {
        // No active process now
        this.activeProcess = undefined;
        // Can't execute a program if there is nothing to execute
        this.CPU.isExecuting = false;
        this.shortTermSched.decide();
    }
};

/**
 * Shuts down the kernel
 */
Kernel.prototype.shutdown = function() {
    this.trace("begin shutdown OS");
    // TODO: Check for running processes. Alert if there are some, alert and
    // stop. Else...
    // ... Disable the Interrupts.
    this.trace("Disabling the interrupts.");
    this.disableInterrupts();

    // 
    // Unload the Device Drivers?
    // More?
    //

    this.trace("end shutdown OS");

    clearInterval(this.host.hardwareClockID);
};

/**
 * Runs tasks every hardware clock pulse
 */
Kernel.prototype.onCPUClockPulse = function() {
    /*
     * This gets called from the host hardware sim every time there is a
     * hardware clock pulse. This is NOT the same as a TIMER, which causes an
     * interrupt and is handled like other interrupts. This, on the other hand,
     * is the clock pulse from the hardware (or host) that tells the kernel that
     * it has to look for interrupts and process them if it finds any.
     */
    if (this.TEQ.size() > 0) {
        // decrease time
        this.TEQ.decrement(CPU_CLOCK_INTERVAL);
    }

    if (this.IQ.getSize() > 0) {
        // Check for an interrupt, are any. Page 560
        // Process the first interrupt on the interrupt queue.
        // TODO: Implement a priority queue based on the IRQ number/id to
        // enforce interrupt priority.
        var interrupt = this.IQ.dequeue();
        this.interruptHandler(interrupt.irq, interrupt.params);

    } else if (this.TEQ.getMin().timeLeft <= 0) {
        // handle timed events
        this.IQ.enqueue(this.TEQ.pop().interrupt);

    } else if (this.CPU.isExecuting) {
        // If there are no interrupts then run one CPU cycle if there is
        // anything being processed.
        this.CPU.cycle();
    } else {
        // If there are no interrupts and there is nothing being executed then
        // just be idle.
        this.trace("Idle");
    }
};

// Interrupt Handling
/**
 * Turns on interrupt handling
 */
Kernel.prototype.enableInterrupts = function() {
    // Keyboard
    this.host.enableKeyboardInterrupt();
    // Put more here.
};

/**
 * Turns off interrupt handling
 */
Kernel.prototype.disableInterrupts = function() {
    // Keyboard
    this.host.disableKeyboardInterrupt();
    // Put more here.
};

/**
 * Handles incoming interrupts from the queue
 * 
 * @param irq
 *            The interrupt code
 * @param params
 *            The data associated with the interrupt
 */
// This is the Interrupt Handler Routine. Pages 8 and 560.
Kernel.prototype.interruptHandler = function(irq, params) {
    // Trace our entrance here so we can compute Interrupt Latency by analyzing
    // the log file later on.
    // Page 766.
    this.trace("Handling IRQ~" + irq);

    // Invoke the requested Interrupt Service Routine via Switch/Case rather
    // than an Interrupt Vector.
    // Note: There is no need to "dismiss" or acknowledge the interrupts in our
    // design here.
    // Maybe the hardware simulation will grow to support/require that in the
    // future.
    if (irq in this.IV) {
        // handle interrupt
        this.IV[irq](params);
    } else {
        this.trapError("Invalid Interrupt Request. irq=" + irq + " params=["
                + params + "]");
    }
};

/**
 * Handles timed interrupts
 * 
 * @param params
 *            The data associated with the timed interrupt
 */
// The built-in TIMER (not clock) Interrupt
// Service Routine
// (as opposed to an ISR coming from a device driver).
Kernel.prototype.timerISR = function(params) {
    // Check multiprogramming parameters and enforce quanta here.
    // Call the scheduler / context switch here if necessary.

    // Kernel can do more important things in the future, for now just execute
    // timer events
    if (params.length === 2) {
        if (DEBUG) {
            console.log("executing timed: " + params);
        }

        // Execute the delayed function
        params[1].call(params[0], new Date());
    }
};

/**
 * Get the next Process id
 * 
 * @returns {Number}
 */
Kernel.prototype.newPID = function() {
    return this.nextPID++;
};

// System Calls... that generate software interrupts via tha Application
// Programming
// Interface library routines.

// Some ideas:
// - ReadConsole
// - WriteConsole
// - CreateProcess
// - ExitProcess
// - WaitForProcessToExit
// - CreateFile
// - OpenFile
// - ReadFile
// - WriteFile
// - CloseFile

// Steps program execution
Kernel.prototype.programStep = function() {
    // Registers an interrupt to execute one cycle of the program
    this.queueInterrupt(this.PROG_STEP, []);
};

// OS Utility Routines
/**
 * diag info
 */
Kernel.prototype.trace = function(msg) {
    // Check globals to see if trace is set ON. If so, then (maybe) log the
    // message.
    if (_Trace) {
        if (msg === "Idle") {
            // We can't log every idle clock pulse because it would lag the
            // browser very quickly.
            if (this.host.clock % (1000 / CPU_CLOCK_INTERVAL) === 0) // Check
            // the
            // CPU_CLOCK_INTERVAL
            // in globals.js
            // for an
            { // idea of the tick rate and adjust this
                // line accordingly.
                this.host.log(msg, "OS");
            }
        } else {
            this.host.log(msg, "OS");
        }
    }
};

/**
 * Blue screen of death, very bad
 */
Kernel.prototype.trapError = function(msg) {
    this.host.log("OS ERROR - TRAP: " + msg);
    var kernel = this;

    var textOut = function(str) {
        var context = kernel.host.contexts[kernel.CONSOLE_CID];

        context.strokeStyle = 'black';
        context.fillStyle = 'white';
        context.font = "18px Courier";

        var wid = context.measureText(str).width;
        var xs = kernel.host.screens[kernel.CONSOLE_CID].width / 2 - wid / 2;
        var ys = kernel.host.screens[kernel.CONSOLE_CID].height / 2;

        context.strokeText(str, xs, ys);
        context.fillText(str, xs, ys);

    };

    if (msg === "BSOD") {
        var crashImg = new Image();

        crashImg.onload = function() {
            kernel.host.contexts[kernel.CONSOLE_CID].drawImage(crashImg, 0, 0,
                    kernel.host.screens[kernel.CONSOLE_CID].width,
                    kernel.host.screens[kernel.CONSOLE_CID].height);

            var str = "Your system's dead, there's something wrong";

            textOut(str);
        };

        // originally from
        // http://www.fanpop.com/clubs/david-bowie/images/348938/title/bowie-wallpaper
        crashImg.src = 'images/bowiesd.jpg';
    } else {

        var str = "SYSTEM ERROR : " + msg + " : CHECK FOR DOS";

        var width = this.host.screens[this.CONSOLE_CID].width;
        var height = this.host.screens[this.CONSOLE_CID].height;

        var cw, ch, nw, nh;
        var blue = true;

        this.host.contexts[this.CONSOLE_CID].fillStyle = 'blue';

        for (ch = 0; ch < height; ch += nh) {
            nh = (2 + Math.floor(Math.random() * 5));

            for (cw = 0; cw < width; cw += nw) {
                nw = (2 + Math.floor(Math.random() * 5));

                this.host.contexts[this.CONSOLE_CID].fillRect(cw, ch, nw, nh);

                if (blue) {
                    this.host.contexts[this.CONSOLE_CID].fillStyle = 'grey';
                } else {
                    this.host.contexts[this.CONSOLE_CID].fillStyle = 'blue';
                }
                blue = !blue;

            }// end by width fill
        }// end by height fill

        textOut(str);
    }// end BSOD else

    this.shutdown();
};
