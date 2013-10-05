/*
 * Memory management unit
 */

function MMU() {

    //Programs only get 256 bytes of mem
    this.PROGRAM_ALLOWED_MEM = 256;

    this.init = function() {
        // ????
    };

    /*
     * Reads a byte of data from the currently executing program's memory space
     * 
     * @param addr The address to read from (as a decimal value) 
     *              This will be wrapped to remain inside the program's memory
     *              space.
     * @return The byte of data at addr. 
     */
    this.read = function (addr) {
        //Get PCB
        var pcb = _KernelCurrentProcess;

        //Check address is in process memory
        var maxAddr = pcb.memStart + pcb.memLimit;
        if(addr <= maxAddr && addr >= pcb.memStart) {
            //TODO: Maybe add pages?
            return _MEMORY.read(addr);
        }
        else {
            //MEM ACCESS VIOLATION!!!
            _KernelInterruptQueue.enqueue(new Interrupt(SW_FATAL_IRQ, [1]));
        }
    };

    /*
     *  Writes a byte of data to the currently executing program's mem space
     *  
     *  @param addr The address to read to (as a decimal value)
     *              This will be wrapped to remain inside the program's mem space
     *  @param byte The byte of data to write (as a hex value)
     */
    this.write = function(addr, byte) {
        //Get PCB
        //TODO: Clean this up so it's getting the PCB by PID
        var pcb = _KernelCurrentProcess;

        var realAddr = addr % pcb.memLimit;
        realAddr += pcb.memStart;

        _MEMORY.write(realAddr, byte);
    };

    this.zeroMem = function(pcb) {
        for(var i = pcb.memStart; i < (pcb.memStart + pcb.memLimit); ++i) {
            _MEMORY.write(i, '00');
        }
    };
}
