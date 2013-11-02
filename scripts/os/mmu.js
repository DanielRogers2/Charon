/*
 * Memory management unit
 */

/**
 * Generates a new Memory management unit
 * 
 * @param access_violation_handler
 *            A function pointer to execute whenever a program violates its
 *            memory access privileges. The MMU will supply the process id of
 *            the offending process.
 * @param pcb_lookup
 *            A function pointer that will return a process control block for
 *            either the currently executing process, or the supplied process
 *            id.
 * @param memory
 *            A pointer to main memory for the MMU to read/write to
 */
function MMU(access_violation_handler, pcb_lookup, memory) {

    // Programs only get 256 bytes of mem
    this.PROGRAM_ALLOWED_MEM = 256;
    // 8 bytes per page
    this.PAGE_SIZE = 8;

    // Kernel-supplied function for reacting to access violations
    this.accessViolationHandler = access_violation_handler;
    // Kernel-supplied access to physical memory
    this.memory = memory;
    // Kernel-supplied process control block accessor
    this.getPcb = pcb_lookup;

    // List of free memory pages
    // TODO Set of virtual memory handling
    this.freePages = [];

    // Mapping of page values to physical addresses
    this.pageMap = {};

    // Populate list with free physical memory pages
    for ( var i = 0; i < Math.floor(this.memory.SIZE / this.PAGE_SIZE); ++i) {
        this.freePages[i] = i;
        // Only mapping virtual to physical mem right now, so we don't care
        // about swappint, etc
        this.pageMap[i] = i * this.PAGE_SIZE;
    }
}

/**
 * Reads a byte of data from the currently executing program's memory space
 * 
 * @param addr
 *            The address to read from (as a decimal value) This will be wrapped
 *            to remain inside the program's memory space.
 * @return The byte of data at addr.
 */
MMU.prototype.read = function(addr) {
    // Get PCB
    var pcb = this.getPcb();

    // Check address is in process memory
    if (addr < pcb.memLimit) {
        // Read from address translated into process memory
        return this.memory.read(this.translate(pcb, addr));
    } else {
        if (DEBUG) {
            console.log(pcb);
            console.log(addr);
        }
        // mem access violation
        this.accessViolationHandler(pcb.PID);
        return '0x00';
    }
};

/**
 * Writes a byte of data to the currently executing program's mem space
 * 
 * @param addr
 *            The address to read to (as a decimal value) This will be wrapped
 *            to remain inside the program's mem space
 * @param byte
 *            The byte of data to write (as a hex value)
 * @param pid
 *            [Optional] The process id of the program doing the writing
 */
MMU.prototype.write = function(addr, byte, pid) {
    var pcb = this.getPcb(pid);

    if (addr < pcb.memLimit) {
        // Write to address translated into process memory
        this.memory.write(this.translate(pcb, addr), byte);
    } else {
        if (DEBUG) {
            console.log(pcb);
            console.log(addr);
        }
        // mem access violation
        this.accessViolationHandler(pcb.PID);
    }
};

/**
 * Zero out the memory for the process
 */
MMU.prototype.zeroMem = function(pcb) {
    // Zero out all the memory blocks
    var mmu = this;

    // Zeroes a page of memory given its starting address
    var zero = function(pagestart) {
        for ( var i = 0; i < mmu.PAGE_SIZE; ++i) {
            mmu.memory.write(pagestart + i, '00');
        }
    };

    // Get each page from the allocated pages and zero them
    for ( var i = 0; i < pcb.pageList.length; ++i) {
        zero(this.pageMap[pcb.pageList[i]]);
    }
};
/**
 * 
 * @return false if no memory to allocate
 */
MMU.prototype.allocateMem = function(pcb, bytes) {

    if (DEBUG) {
        console.log("alloc: " + bytes);
        console.log("free: " + (this.freePages.length * this.PAGE_SIZE));
    }

    if ((this.freePages.length * this.PAGE_SIZE) < bytes
            || (pcb.memLimit + bytes) > this.PROGRAM_ALLOWED_MEM) {
        // There are not enough pages to allocate to the pcb, or it's not
        // allowed to have more
        return false;
    }

    for ( var i = 0; i < bytes; i += this.PAGE_SIZE) {
        pcb.pageList.push(this.freePages.shift());
    }

    // Update its memory limit
    pcb.memLimit = pcb.pageList.length * this.PAGE_SIZE;

    return true;
};

/**
 * Frees memory used by a PCB
 */
MMU.prototype.freeMem = function(pcb, bytes) {

    var freed = 0;
    while (freed + this.PAGE_SIZE <= bytes) {
        this.freePages.push(pcb.pageList.pop());
        freed += this.PAGE_SIZE;
    }
};

/**
 * Translates an address to the physical memory location Assumes that addr is in
 * the memory allowed for PCB
 */
MMU.prototype.translate = function(pcb, addr) {
    // Get the page it's looking for
    var pageID = pcb.pageList[Math.floor(addr / this.PAGE_SIZE)];
    // Base page address
    var memaddr = this.pageMap[pageID];
    // Offset into page
    memaddr += addr % this.PAGE_SIZE;

    // TODO Handle paging
    return memaddr;
};
