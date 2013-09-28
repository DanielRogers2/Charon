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
     *              The data word will be padded/truncated to WORD_SIZE length
     *              value (WORD_SIZE == length of data word in hex chars)
     *              Padding is done with 00
     */
    this.write = function(address, data) {
        //Get our address to something we can use to array index
        address = hexToDec(address);

        //I wish js had integer division so I didn't have to do this
        //  every. single. time.
        var blockAddr = Math.floor(address / this.BLOCK_SIZE);
        var internalAddr = address % this.BLOCK_SIZE;

        //do memory write
        for(var i = 0; i < this.WORD_SIZE; ++i) {
            //Writing data from input data
            if( (data.length - 1) >= i) {
                this.RAM[blockAddr][internalAddr] = data[i];
            }
            //Padding unspecified data
            else {
                this.RAM[blockAddr][internalAddr] = '00';
            }
            
            //check if read flows into next block of memory
            ++internalAddr;
            if(internalAddr == this.BLOCK_SIZE) {
                intenalAddr = 0;
                ++blockAddr;
            }
        }
    };

    /*
     * Reads data from memory at the specified location
     * 
     * @param address The address to read data from as a hex value
     * 
     * @return A word of data (WORD_SIZE bytes expressed as hex values)
     */
    this.read = function(address) {
        //Get array index form
        address = hexToDec(address);
        var blockAddr = Math.floor(address / this.BLOCK_SIZE);
        var internalAddr = address % this.BLOCK_SIZE;

        var byte;
        var data = [];
        
        for(var i = 0; i < this.WORD_SIZE; ++i) {
            byte = this.RAM[blockAddr][internalAddr];
            //Make sure to return sets of hex pairs
            byte = (byte.length == 1) ? '0' + byte : byte;
            data[i] = byte;
            
            ++internalAddr;
            if(internalAddr == this.BLOCK_SIZE) {
                internalAddr = 0;
                ++blockAddr;
            }
        }
    };

    /*
     * I NEEDS MORE RAMS
     */
    this.downloadMoreRam = function(size) {
        this.SIZE += size;
    };

    this.RAM = [];
    this.SIZE = 768;     //bytes of mem
    this.WORD_SIZE = 6;  //bytes per word, must be less than block size
    this.BLOCK_SIZE = 8; //bytes per row of memory

    var temp = [];
    for(var i = 0; i < this.BLOCK_SIZE; ++i) {
        temp[i] = 0;
    }

    for (var i = 0; i < Math.floor(this.SIZE / this.BLOCK_SIZE); ++i) {
        this.RAM[i] = temp;
    }
}
