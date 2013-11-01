/*
 * Memory management unit
 */

function MMU(kernel) {

    // Programs only get 256 bytes of mem
    this.PROGRAM_ALLOWED_MEM = 256;

    this.kernel = kernel;
    this.memory = kernel.memory;
}

/*
 * Reads a byte of data from the currently executing program's memory space
 * 
 * @param addr The address to read from (as a decimal value) This will be
 * wrapped to remain inside the program's memory space. @return The byte of data
 * at addr.
 */
MMU.prototype.read = function(addr) {
    // Get PCB
    var pcb = this.kernel.activeProcess;

    // Check address is in process memory
    if (addr < pcb.memLimit) {
        // TODO: Maybe add pages?

        // Read from address translated into process memory
        return this.memory.read(addr + pcb.memStart);
    } else {
        console.log(pcb);
        console.log(addr);
        // MEM ACCESS VIOLATION!!!
        this.kernel.queueInterrupt(this.kernel.SW_FATAL_IRQ, [ 1 ]);
    }
};

/*
 * Writes a byte of data to the currently executing program's mem space
 * 
 * @param addr The address to read to (as a decimal value) This will be wrapped
 * to remain inside the program's mem space @param byte The byte of data to
 * write (as a hex value)
 */
MMU.prototype.write = function(addr, byte) {
    // Get PCB
    // TODO: Clean this up so it's getting the PCB by PID
    var pcb = this.kernel.activeProcess;

    var realAddr = addr % pcb.memLimit;
    realAddr += pcb.memStart;

    this.memory.write(realAddr, byte);
};

MMU.prototype.zeroMem = function(pcb) {
    for ( var i = pcb.memStart; i < (pcb.memStart + pcb.memLimit); ++i) {
        this.memory.write(i, '00');
    }
};
