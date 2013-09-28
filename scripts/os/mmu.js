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

        //wrap address inside program memory
        var realAddr = addr % pcb.memLimit; 
        
        //Move over into programs actual address space
        //TODO: Maybe add pages?
        realAddr += pcb.memStart;

        return _MEMORY.read(realAddr);
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
        var pcb = _KernelCurrentProcess;
        
        var realAddr = addr % pcb.memLimit;
        realAddr += pcb.memStart;
        
        _MEMORY.write(realAddr, byte);
    };
}
