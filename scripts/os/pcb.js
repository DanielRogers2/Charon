/*
 * Process control block implementation
 */

function PCB(kernel) {

    /*
     * One of new, ready, running, waiting, failed, done
     */
    this.state = 'new';

    this.PC = 0; // Program Counter
    this.Acc = 0; // Accumulator
    this.Xreg = 0; // X register
    this.Yreg = 0; // Y register
    this.Zflag = 0; // Z-ero flag (Think of it as "isZero".)

    this.kernel = kernel;
    this.memLimit = 0; //Can't put any memory in because no memory allocated
    this.PID = 0;
    this.IOWait = false; // not waiting for I/O
    
    //No allocated pages yet
    this.pageList = [];
}

/*
 * Set up program prior to execution
 */
PCB.prototype.init = function(pid) {
    this.PID = pid;
    this.kernel.MMU.zeroMem(this);
    this.state = 'ready'; // Program is ready once loaded
};

/*
 * Reset program data
 */
PCB.prototype.zeroRegisters = function() {
    this.PC = 0; // Program Counter
    this.Acc = 0; // Accumulator
    this.Xreg = 0; // X register
    this.Yreg = 0; // Y register
    this.Zflag = 0; // Z-ero flag

    this.IOWait = false;
};

/*
 * Synchronizes PCB with CPU
 */
PCB.prototype.synchronize = function() {
    this.PC = this.kernel.CPU.PC;
    this.Acc = this.kernel.CPU.Acc;
    this.Xreg = this.kernel.CPU.Xreg;
    this.Yreg = this.kernel.CPU.Yreg;
    this.Zflag = this.kernel.CPU.Zflag;
};

/**
 * Loads the program state into the CPU
 */
PCB.prototype.load = function() {
    this.kernel.CPU.PC = this.PC;
    this.kernel.CPU.Acc = this.Acc;
    this.kernel.CPU.Xreg = this.Xreg;
    this.kernel.CPU.Yreg = this.Yreg;
    this.kernel.CPU.Zflag = this.Zflag;
};

PCB.prototype.display = function(output) {
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

    output.putText("    pages: " + this.pageList);
    output.advanceLine();

    output.putText("  Mem allocd: " + this.memLimit);
    output.advanceLine();
};
