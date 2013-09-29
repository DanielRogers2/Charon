/*
 * Process control block implementation
 */

function PCB () {
    
    this.state = 'new';
    
    this.PC = 0; // Program Counter
    this.Acc = 0; // Accumulator
    this.Xreg = 0; // X register
    this.Yreg = 0; // Y register
    this.Zflag = 0; // Z-ero flag (Think of it as "isZero".)
    
    this.memStart = 0;  //base address
    this.memLimit = _MMU.PROGRAM_ALLOWED_MEM; //maximum memory allowed
    this.PID = 0;
    this.IOWait = false; //not waiting for I/O
    
    this.init = function(pid, basemem) {
        this.memStart = basemem; //where the process is loading into
        this.PID = pid;         
        this.state = 'ready';    //Program is ready once loaded
    };
    
}