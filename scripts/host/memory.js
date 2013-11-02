/*
 * Implementation of main memory for host OS
 * 
 */

/**
 * Generates a new memory unit
 * 
 * @param display_fn
 *            An optional function for updating the display of memory. This will
 *            be called with three arguments: the block address of the update,
 *            the block-internal address of the update, and the new value
 */
function Memory(display_fn) {

    this.RAM = [];
    this.SIZE = 768; // bytes of mem
    this.BLOCK_SIZE = 8; // bytes per row of memory

    // host-specified display function
    this.display = display_fn;

    // Initialize ram
    for ( var i = 0; i < Math.floor(this.SIZE / this.BLOCK_SIZE); ++i) {
        this.RAM[i] = [];

        for ( var j = 0; j < this.BLOCK_SIZE; ++j) {
            this.RAM[i][j] = 0;
        }
    }
}

/**
 * Writes data to the memory at a specified location
 * 
 * @param address
 *            The address (as a decimal value) to store data in
 * @param data
 *            the data word (as a byte hex value) to store in memory
 */
Memory.prototype.write = function(address, data) {
    // I wish js had integer division so I didn't have to do this
    // every. single. time.
    var blockAddr = Math.floor(address / this.BLOCK_SIZE);
    var internalAddr = address % this.BLOCK_SIZE;

    // do memory write
    this.RAM[blockAddr][internalAddr] = data;

    // Render this memory if we've been given a display function pointer
    if (this.display)
        this.display(blockAddr, internalAddr, data);
};

/**
 * Reads data from memory at the specified location
 * 
 * @param address
 *            The address to read data from as a decimal value
 * 
 * @return A byte of data (2 hex digits)
 */
Memory.prototype.read = function(address) {
    // Get array index form
    var blockAddr = Math.floor(address / this.BLOCK_SIZE);
    var internalAddr = address % this.BLOCK_SIZE;

    var byte;

    byte = this.RAM[blockAddr][internalAddr];
    // Make sure to return sets of hex pairs
    byte = (byte.length == 1) ? '0' + byte : byte;

    return byte;
};

/**
 * I NEEDS MORE RAMS
 */
Memory.prototype.downloadMoreRam = function(size) {
    this.SIZE += size;
};
