/*
 * Process control block implementation
 */

/**
 * Creates a new process control block for the specified process id
 * 
 * @param pid
 *            The unique id of the process
 * @param code_load_fn
 *            A function that will allow code associated with this process to be
 *            written to memory. The code will be passed in as an array of
 *            bytes.
 * @param register_read_fn
 *            A function that will read the CPU registers that the process is
 *            executing on. The expected return is an associative array with the
 *            values: 'PC', 'Acc', 'Xreg', 'Yreg', 'Zflag' for the program
 *            counter, accumulator, x-register, y-register, and zero-flag
 *            respectively.
 * @param register_write_fn
 *            A function that will write to the CPU registers. The function will
 *            be supplied with a single argument: an associative array with the
 *            same format as above.
 */
function PCB( pid, code_load_fn, register_read_fn, register_write_fn, priority ) {

    /*
     * One of new, ready, running, waiting, failed, done
     */
    this.state = 'new';
    // Program Counter
    this.PC = 0;
    // Accumulator
    this.Acc = 0;
    // X register
    this.Xreg = 0;
    // Y register
    this.Yreg = 0;
    // Z-ero flag (Think of it as "isZero".)
    this.Zflag = 0;

    // Can't put any memory in because no memory allocated
    this.memLimit = 0;
    // Kernel-provided process identifier
    this.PID = pid;
    // Kernel-provided function for loading program code into memory
    this.codeLoader = code_load_fn;
    // Kernel-provided function to read the register state
    this.registerRead = register_read_fn;
    // Kernel-provided function to write to the register state
    this.registerWrite = register_write_fn;
    // not waiting for I/O
    this.IOWait = false;

    // Priority
    this.priority = ( priority === undefined || priority > 255 ) ? 255
            : priority;

    // No allocated pages yet
    this.pageList = [ ];
}

/**
 * Set up program prior to execution
 * 
 * @param code
 *            The code to load for execution, expressed as an array of bytes
 */
PCB.prototype.init = function( code ) {
    this.codeLoader(code);
    // Program is ready once loaded
    this.state = 'ready';
};

/**
 * Reset program data -- Does not reset loaded code!
 */
PCB.prototype.zeroRegisters = function( ) {
    this.PC = 0; // Program Counter
    this.Acc = 0; // Accumulator
    this.Xreg = 0; // X register
    this.Yreg = 0; // Y register
    this.Zflag = 0; // Z-ero flag

    this.IOWait = false;
};

/**
 * Synchronizes PCB with CPU
 */
PCB.prototype.synchronize = function( ) {
    // Get the map of values from the CPU
    var regs = this.registerRead();
    // Update internal values
    this.PC = regs['PC'];
    this.Acc = regs['Acc'];
    this.Xreg = regs['Xreg'];
    this.Yreg = regs['Yreg'];
    this.Zflag = regs['Zflag'];
};

/**
 * Loads the program state into the CPU
 */
PCB.prototype.load = function( ) {
    // Put the values in an associative map
    var regs =
    {
        'PC' : this.PC,
        'Acc' : this.Acc,
        'Xreg' : this.Xreg,
        'Yreg' : this.Yreg,
        'Zflag' : this.Zflag
    };

    // Write them to the CPU
    this.registerWrite(regs);
};

/**
 * Prints the PCB state
 * 
 * @param output
 *            The location to print to. Expects two operations: advanceLine and
 *            putText, for moving down a line in the output and rendering text
 *            strings respectively.
 */
PCB.prototype.display = function( output ) {
    // Display PCB
    output.advanceLine();
    output.putText("PCB:");
    output.advanceLine();

    output.putText("         PID: " + this.PID);
    output.advanceLine();

    output.putText("          PC: " + decToHex(this.PC));
    output.advanceLine();

    output.putText("         ACC: " + decToHex(this.Acc));
    output.advanceLine();

    output.putText("        Xreg: " + decToHex(this.Xreg));
    output.advanceLine();

    output.putText("        Yreg: " + decToHex(this.Yreg));
    output.advanceLine();

    output.putText("       Zflag: " + decToHex(this.Zflag));
    output.advanceLine();

    output.putText("       state: " + this.state);
    output.advanceLine();

    output.putText("    priority: " + this.priority);
    output.advanceLine();

    output.putText("    pages: " + this.pageList);
    output.advanceLine();

    output.putText("  Mem allocd: " + this.memLimit);
    output.advanceLine();
};
