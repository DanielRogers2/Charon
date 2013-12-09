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
 * @param alloc
 *            A function that will return a key for use with a backing store
 * @param read
 *            A function that will return an array of bytes contained in the
 *            backing store, provided a key obtained through alloc
 * @param write
 *            A function that will take a key obtained by alloc, and an array of
 *            bytes, and put the bytes on the backing store so that a subsequent
 *            read will return the bytes.
 * @param release
 *            A function that will take a key obtained by alloc and is used by
 *            the MMU to indicate that it will no longer be using the provided
 *            backing store key
 */
function MMU( access_violation_handler, pcb_lookup, memory, alloc, read, write,
        release ) {

    // Programs only get 256 bytes of mem
    this.PROGRAM_ALLOWED_MEM = 256;
    // 8 bytes per page
    this.PAGE_SIZE = 256;

    // Kernel-supplied function for reacting to access violations
    this.accessViolationHandler = access_violation_handler;
    // Kernel-supplied access to physical memory
    this.memory = memory;
    // Kernel-supplied process control block accessor
    this.getPcb = pcb_lookup;

    // Kernel-supplied access to file allocation
    this.allocPage = alloc;
    // Kernel-supplied access to file reading
    this.backedRead = read;
    // Kernel-supplied access to file writing
    this.backedWrite = write;
    // Kernel-supplied access to file release
    this.releasePage = release;

    // Just an incremental counter for page #'s
    this.next_page = 0;

    // List of physical memory page addresses
    this.pageAddresses = [ ];

    // List of free pages, as indexes into pageAddresses table
    this.freePages = [ ];

    // Mapping of page values to physical addresses in memory
    // A map of page# => pageAddresses index
    this.cachedMap = { };

    // Mapping of page values to values on the backing store
    // A map of page# ==> backing store key
    this.backedMap = { };

    // A zero-page, for use during virtual memory allocation
    this.zero_page = [ ];
    for ( var i = 0; i < this.PAGE_SIZE; ++i ) {
        this.zero_page[i] = '00';
    }

    // Populate list with free physical memory pages
    for ( var i = 0; i < Math.floor(this.memory.SIZE / this.PAGE_SIZE); ++i ) {
        // Store address in physical memory
        this.pageAddresses[i] = i * this.PAGE_SIZE;
        this.freePages[i] = i;
    }
}

/**
 * Reads a byte of data from the currently executing program's memory space
 * 
 * @param addr
 *            The address to read from (as a decimal value).
 * @return The byte of data at addr.
 */
MMU.prototype.read = function( addr ) {
    // Get PCB
    var pcb = this.getPcb();

    // Check address is in process memory
    if ( addr < pcb.memLimit ) {
        // Read from address translated into process memory
        return this.memory.read(this.translate(pcb, addr));
    }
    else {
        if ( DEBUG ) {
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
MMU.prototype.write = function( addr, byte, pid ) {
    var pcb = this.getPcb(pid);

    if ( addr < pcb.memLimit ) {
        // Write to address translated into process memory
        this.memory.write(this.translate(pcb, addr), byte);
    }
    else {
        if ( DEBUG ) {
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
MMU.prototype.zeroMem = function( pcb ) {
    // Zero out all the memory blocks
    var mmu = this;

    // Zeroes a page of memory given its starting address
    var zero = function( pagestart ) {
        for ( var i = 0; i < mmu.PAGE_SIZE; ++i ) {
            mmu.memory.write(pagestart + i, '00');
        }
    };

    var pageId;
    // Get each page from the allocated pages and zero them
    for ( var i = 0; i < pcb.pageList.length; ++i ) {
        pageId = pcb.pageList[i];
        if ( pageId in this.cachedMap ) {
            // zero physical memory
            zero(this.pageAddresses[this.cachedMap[pageId]]);
        }
        else {
            // Zero backing store
            this.backedWrite(this.backedMap[pageId], this.zero_page);
        }
    }
};

/**
 * Does initial memory allocation for a PCB.
 * 
 * @return false if no memory to allocate
 */
MMU.prototype.allocateMem = function( pcb, bytes ) {

    if ( DEBUG ) {
        console.log("alloc: " + bytes);
        console.log("free: " + ( this.pageAddresses.length * this.PAGE_SIZE ));
    }

    if ( ( pcb.memLimit + bytes ) > this.PROGRAM_ALLOWED_MEM ) {
        // it's not allowed to have more
        return false;
    }

    // Number of pages allocated
    var allocd = 0;

    // See if there is free physical memory
    if ( Object.keys(this.cachedMap).length < this.pageAddresses.length ) {
        // Less pages cached in physical memory than free Pages
        for ( ; ( allocd < bytes ) && this.freePages.length; allocd += this.PAGE_SIZE ) {
            // Add pages until out of cache-able memory, or all bytes written

            // Map page# to freePage index
            var pageId = this.nextPage();
            this.cachedMap[pageId] = this.freePages.shift();

            // Store page in pcb
            pcb.pageList.push(pageId);
        }
    }

    if ( allocd < Math.floor(bytes / this.PAGE_SIZE) ) {
        // Didn't allocate enough pages, need to write to disk
        var write_success = true;

        for ( ; allocd < bytes; allocd += this.PAGE_SIZE ) {
            // Write to disk, and map to page
            var pageId = this.nextPage();
            // Get backed memory
            var backed = this.allocPage();

            // Map pageid->backed memory
            this.backedMap[pageId] = backed;

            // Store page in pcb
            pcb.pageList.push(pageId);

            // Zero-write to the page, to make sure there is enough memory
            write_success = this.backedWrite(backed, this.zero_page);

            // See if we could allocate enough room for a page
            if ( !write_success ) {
                // need to walk back
                console.log("alloc write fail");
                console.log(backed);
                break;
            }

        }

        if ( !write_success ) {
            // Walk-back allocation
            // Since pcb has the page list, just free
            this.freeMem(pcb, allocd);

            // Un-successful
            return false;
        }
    }

    // Update its memory limit
    pcb.memLimit = pcb.pageList.length * this.PAGE_SIZE;

    return true;
};

/**
 * Gets the next Page ID
 */
MMU.prototype.nextPage = function( ) {
    return this.next_page++;
};

/**
 * Frees memory used by a PCB.
 */
MMU.prototype.freeMem = function( pcb, bytes ) {

    var freed = 0;
    var page;
    while ( freed + this.PAGE_SIZE <= bytes ) {
        // Get the next pageID
        page = pcb.pageList.pop();
        // Page is using up physical memory
        if ( page in this.cachedMap ) {
            // Mark it as available
            this.freePages.push(this.cachedMap[page]);
            // Remove it from the list of used cached memory
            delete this.cachedMap[page];
        }
        else {
            // Page is on disk
            // get the disk key and free the disk space
            this.releasePage(this.backedMap[page]);
            // Remove it from the list of disk-backed pages
            delete this.backedMap[page];
        }

        freed += this.PAGE_SIZE;
    }
};

/**
 * Translates an address to the physical memory location. Assumes that addr is
 * in the memory allowed for PCB
 */
MMU.prototype.translate = function( pcb, addr ) {
    // Get the page it's looking for
    var pageID = pcb.pageList[Math.floor(addr / this.PAGE_SIZE)];

    // Base page address
    var memaddr;

    // See if in physical memory
    if ( !( pageID in this.cachedMap ) ) {
        // Need to swap in from disk
        // Select a random page
        var victim = Math.floor(Math.random()
                * Object.keys(this.cachedMap).length);
        // kill it, back to disk
        victim = Object.keys(this.cachedMap)[victim];

        // Get the backing store key
        var backedKey = this.backedMap[pageID];

        // Store the incoming program's data from the backing store
        var incoming = this.backedRead(backedKey);

        // Read the outgoing data cached in physical memory
        // Get the page start address
        memaddr = this.pageAddresses[this.cachedMap[victim]];
        var outgoing = [ ];
        for ( var i = 0; i < this.PAGE_SIZE; ++i ) {
            // Read byte
            outgoing[i] = this.memory.read(memaddr);
            // Move up a byte
            ++memaddr;
        }

        // Write page to backing store
        // TODO Check for write success
        this.backedWrite(backedKey, outgoing);

        // Write incoming data to physical memory
        memaddr = this.pageAddresses[this.cachedMap[victim]];
        for ( var i = 0; i < this.PAGE_SIZE; ++i ) {
            this.memory.write(memaddr, incoming[i]);
            // Move up a byte
            ++memaddr;
        }

        // Set pageID to be replaced page location
        this.cachedMap[pageID] = this.cachedMap[victim];
        // Set victim to reference backing store
        this.backedMap[victim] = backedKey;

        // delete old reference to cached
        delete this.cachedMap[victim];
        // delete old reference to backed
        delete this.backedMap[pageID];
    }

    // Get page start
    memaddr = this.pageAddresses[this.cachedMap[pageID]];

    // Offset into page
    memaddr += addr % this.PAGE_SIZE;

    return memaddr;
};
