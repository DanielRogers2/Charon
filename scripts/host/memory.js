/*
 * Implementation of main memory for host OS
 * 
 */

function Memory() {

    /*
     * Writes data to the memory at a specified location
     * 
     * @param address The address (as a hex value) to store data in
     * @param data The data word (as a byte hex value) to store in memory
     */
    this.write = function(address, data) {
        //Get our address to something we can use to array index
        address = hexToDec(address);

        //I wish js had integer division so I didn't have to do this
        //  every. single. time.
        var blockAddr = Math.floor(address / this.BLOCK_SIZE);
        var internalAddr = address % this.BLOCK_SIZE;

        //do memory write
        this.RAM[blockAddr][internalAddr] = data;
    };

    /*
     * Reads data from memory at the specified location
     * 
     * @param address The address to read data from as a hex value
     * 
     * @return A byte of data (2 hex digits)
     */
    this.read = function(address) {
        //Get array index form
        address = hexToDec(address);
        var blockAddr = Math.floor(address / this.BLOCK_SIZE);
        var internalAddr = address % this.BLOCK_SIZE;

        var byte;
        byte = this.RAM[blockAddr][internalAddr];
        //Make sure to return sets of hex pairs
        byte = (byte.length == 1) ? '0' + byte : byte;
        
        return byte;
    };

    /*
     * I NEEDS MORE RAMS
     */
    this.downloadMoreRam = function(size) {
        this.SIZE += size;
    };

    this.RAM = [];
    this.SIZE = 768;     //bytes of mem
    this.BLOCK_SIZE = 8; //bytes per row of memory

    var temp = [];
    for(var i = 0; i < this.BLOCK_SIZE; ++i) {
        temp[i] = 0;
    }

    for (var i = 0; i < Math.floor(this.SIZE / this.BLOCK_SIZE); ++i) {
        this.RAM[i] = temp;
    }
}
