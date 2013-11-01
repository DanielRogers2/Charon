/*
 * Implementation of main memory for host OS
 * 
 */

function Memory(host) {

    this.RAM = [];
    this.SIZE = 768; // bytes of mem
    this.BLOCK_SIZE = 8; // bytes per row of memory
    this.host = host;
    
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
 * @param address The address (as a decimal value) to store data in @param data
 * the data word (as a byte hex value) to store in memory
 */
Memory.prototype.write = function(address, data) {
    // I wish js had integer division so I didn't have to do this
    // every. single. time.
    var blockAddr = Math.floor(address / this.BLOCK_SIZE);
    var internalAddr = address % this.BLOCK_SIZE;

    // do memory write
    this.RAM[blockAddr][internalAddr] = data;
    
    this.host.updateMemDisplay(blockAddr, internalAddr, data);
};

/**
 * Reads data from memory at the specified location
 * 
 * @param address The address to read data from as a decimal value
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
