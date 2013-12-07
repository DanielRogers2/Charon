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

    this.display = display_fn;
};

/**
 * Writes a string of data to a location on the hard drive specified by track,
 * sector, block, starting at the beginning of the block
 * 
 * @param track
 *            The track to write in as a value in the range 0-this.TRACKS
 * @param sector
 *            The sector to write in as a value in the range [0 - this.SECTORS)
 * @param block
 *            The block to write in as a value in the range [0 - this.BLOCKS)
 * @param data
 *            The data to write, expressed as 2-digit hex values with a length
 *            of [2 - (2 * this.BLOCK_SIZE))
 * @return true if the write succeeds. false if the write fails (invalid write)
 */
HDD.prototype.write = function( track, sector, block, data ) {

    // Validate write location
    if ( !this.validateLocation(track, sector, block) ) {
        // Invalid write location
        console.log("Bad write!");
        return false;
    }
    // Validate data
    else if ( !data.length || data.length % 2 != 0
            || data.length > this.BLOCK_SIZE ) {
        // No data, odd number of digits, data too long or too short
        // Therefore data is invalid
        console.log("Bad data write!");
        return false;
    }

    // Get write location
    var key = '' + track + '' + sector + '' + block;

    // See if data needs to be padded
    if ( data.length < this.BLOCK_SIZE ) {
        // Pad with data @ location
        // Get current data
        var cdata = sessionStorage.getItem(key);
        // Get pad
        var pad = cdata.slice(data.length, this.BLOCK_SIZE);
        // Pad the data
        data += pad;
    }

    // Perform the write
    sessionStorage.setItem(key, data);
    this.display();

    return true;
};

/**
 * Reads data from a location specified by track, sector, block
 * 
 * @param track
 *            The track to read in as a value in the range 0-this.TRACKS
 * @param sector
 *            The sector to read in as a value in the range [0 - this.SECTORS)
 * @param block
 *            The block to read as a value in the range [0 - this.BLOCKS)
 * 
 * @return The data at location if it's a valid location, else ''
 * 
 */
HDD.prototype.read = function( track, sector, block ) {
    if ( !this.validateLocation(track, sector, block) ) {
        // Invalid write location
        console.log("Bad read!");
        return '';
    }
    // Get read location
    var key = '' + track + '' + sector + '' + block;

    return sessionStorage.getItem(key);
};

/**
 * Validates a requested location as valid for the HDD
 * 
 * @return true if it's a valid location
 */
HDD.prototype.validateLocation = function( track, sector, block ) {
    if ( track >= this.TRACKS || sector >= this.SECTORS || block >= this.BLOCKS ) {
        // Invalid write location
        console.log("Bad location!");
        return false;
    }

    return true;
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
    
    storestr = storestr.join('');

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
    // Just use the HTML5 function to delete EVERYTHING
    localStorage.clear();

    // Yes a call to this would probably work just as well, but deleting +
    // recreating makes more sense
    this.createStorage();
    this.display();
};
