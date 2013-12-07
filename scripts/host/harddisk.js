/*
 * Contains the host hardware disk drive
 */

/**
 * Generates a new HDD with
 * 
 * @param display_fn
 *            A vm-specified function to call with display updates. The function
 *            is expected to look at the HDD internals and figure out what to do
 */
function HDD( display_fn ) {
    // Total number of tracks on the disk
    this.TRACKS = 4;
    // Number of sectors per track
    this.SECTORS = 8;
    // Number of blocks per sector
    this.BLOCKS = 8;
    // Number of bytes per block, represented by 2 hex chars each
    this.BLOCK_SIZE = 64;

    // Generate the storage if it doesn't exist yet
    // Check for track 0, sector 0, block 0
    if ( !sessionStorage.getItem('000') ) {
        this.createStorage();
    }
    else {
        console.log("storage");
    }
};

/**
 * Creates a new local store, initializes all tracks, sectors, and blocks to 0
 */
HDD.prototype.createStorage = function( ) {
    // Store data, initially set all to 0
    var storestr = [ ];
    for ( var b = 0; b < this.BLOCK_SIZE; ++b ) {
        storestr[b] = '00';
    }

    // Generate a new store
    var key = '';
    for ( var t = 0; t < this.TRACKS; ++t ) {
        for ( var s = 0; s < this.SECTORS; ++s ) {
            for ( var b = 0; b < this.BLOCKS; ++b ) {
                // Get the key, as a string TSB
                key = '' + t + '' + s + '' + b;
                // Write the store string at location
                sessionStorage.setItem(key, storestr);
            }
        }
    }
};

/**
 * Clears local storage
 */
HDD.prototype.factoryReset = function( ) {
    //Just use the HTML5 function to delete EVERYTHING
    localStorage.clear();
    
    //Yes a call to this would probably work just as well, but deleting + 
    //  recreating makes more sense
    this.createStorage();
};
