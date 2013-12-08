/*
 * File system driver, for interfacing with the hard drive
 */

FileSystemDeviceDriver.prototype = new DeviceDriver;

/**
 * Creates a new file system driver
 * 
 * @returns {FileSystemDeviceDriver}
 */
function FileSystemDeviceDriver( ) {
    // Flags an invalid TSB location
    this.INVALID_PNTR = strToHex('777');
    // Number of hex digits in a pointer
    this.PNTR_SIZE = 6;
    // Master boot record location, track0, sector0, block0
    this.MBR = [ 0, 0, 0 ];
    // VERY SECRET STRING THAT HOLDS MAGICAL MYSTERIES
    // used to see if the hdd is initialized or not
    this.MBR_HEADER = strToHex("CHARON");

    // start of file system index, track0, sector0, block1
    this.FS_INDEX_START = [ 0, 0, 1 ];
    // Start of the file data, track1, sector0, block0
    this.DATA_START = [ 1, 0, 0 ];

    // MBR Initializer
    this.MBR_INITIAL = this.MBR_HEADER + '00'
            + strToHex(this.FS_INDEX_START.join('')) + '00'
            + strToHex(this.DATA_START.join(''));

    // Offset into MBR of head pointer to free file indexes
    this.FS_FREE_OFFSET = this.MBR_HEADER.length + 2;

    // data @ FS_FREE_OFFSET is TSB value, so do that + a 00 space
    // For a total of 8 values (6 for TSB + 2 for space)
    // This marks the head pointer to free data blocks
    this.DATA_FREE_OFFSET = this.FS_FREE_OFFSET + this.PNTR_SIZE + 2;

    // EOF marker, literal value NOT A STRING
    this.EOF = '26';

    // Hard disk to write to
    this.HDD = undefined;
};

/**
 * Formats the hard drive
 * 
 */
FileSystemDeviceDriver.prototype.format = function( ) {
    // Initialize the MBR
    this.HDD.write(this.MBR, this.MBR_INITIAL);

    // "zero initialize" everything
    var pad = [ ];
    // Size is full block, less room for pointer + EOF
    for ( var i = 0; i < this.HDD.BLOCK_SIZE - this.PNTR_SIZE / 2 - 1; ++i ) {
        pad[i] = '00';
    }
    pad = pad.join('');

    var self = this;

    var tag_blocks = function( tstart, sstart, bstart, tend ) {
        var free_next;

        // Write to each track in range
        for ( var t = tstart; t < tend; ++t ) {
            // Write to each sector
            for ( var s = sstart; s < self.HDD.SECTORS; ++s ) {
                // Write to each block in sector
                for ( var b = bstart; b < self.HDD.BLOCKS; ++b ) {
                    // Get the pointer to the next block
                    free_next = [ t, s, ( b + 1 ) % self.HDD.BLOCKS ];
                    // Add an EOF
                    free_next = strToHex(free_next.join('')) + self.EOF;

                    self.HDD.write([ t, s, b ], free_next + pad);
                }
            }
        }

        var t = tend - 1;
        var s = self.HDD.SECTORS - 1;
        var b = self.HDD.BLOCKS - 1;
        // Flag with invalid pointer at end
        self.HDD.write([ t, s, b ], self.INVALID_PNTR);
    };

    // Tag all blocks as free
    // first the index blocks
    tag_blocks(this.FS_INDEX_START[0], this.FS_INDEX_START[1],
            this.FS_INDEX_START[2], this.DATA_START[0]);
    // Then the data blocks
    tag_blocks(this.DATA_START[0], this.DATA_START[1], this.DATA_START[2],
            this.HDD.TRACKS);

};

/**
 * Registers a free block in the hard drive
 * 
 * @param addr
 *            A [T,S,B] block to register as free
 * @param index
 *            true if it is an index block, false if it is a data block
 */
FileSystemDeviceDriver.prototype.free = function( addr, index ) {
    // Get the data at the MBR, for lookup
    var mbr_data = this.HDD.read(this.MBR);
    var hex_addr = strToHex(addr.join());

    // Pointer to the next free block
    var free_next;

    if ( index ) {
        // Get the current free index HEAD pointer
        free_next = mbr_data.slice(this.FS_FREE_OFFSET, this.FS_FREE_OFFSET
                + this.PNTR_SIZE);
        // Update the head pointer to the new block
        this.HDD.write(this.MBR, mbr_data.slice(0, this.FS_FREE_OFFSET)
                + hex_addr);
    }
    else {
        // Get the current free data HEAD pointer
        free_next = mbr_data.slice(this.DATA_FREE_OFFSET, this.DATA_FREE_OFFSET
                + this.PNTR_SIZE);
        this.HDD.write(this.MBR, mbr_data.slice(0, this.DATA_FREE_OFFSET)
                + hex_addr);
    }

    // Write free TSB as next pointer in chain for this file
    // Follow it with an EOF marker to prevent bugs
    this.HDD.write(addr, free_next + this.EOF);
};

/**
 * Allocates a block of data
 * 
 * @param index
 *            true if requesting an index block, false if requesting a data
 *            block
 * @return The address of the block of data or INVALID_PNTR if one cannot be
 *         allocated in the form [t,s,b]
 */
FileSystemDeviceDriver.prototype.allocate = function( index ) {
    // Get the data at the MBR, for lookup
    var mbr_data = this.HDD.read(this.MBR);

    // Pointer to the block to allocate
    var alloc;
    // Pointer to the next free block
    var free_next;
    var new_addr;

    if ( index ) {
        // Get the current free index HEAD pointer
        alloc = mbr_data.slice(this.FS_FREE_OFFSET, this.FS_FREE_OFFSET
                + this.PNTR_SIZE);
    }
    else {
        // Get the current free data HEAD pointer
        alloc = mbr_data.slice(this.DATA_FREE_OFFSET, this.DATA_FREE_OFFSET
                + this.PNTR_SIZE);
    }

    // Update the MBR with the next free block
    if ( alloc != this.INVALID_PNTR ) {
        new_addr = hexToStr(alloc).split('');
        // Get the data in the block, and the address of the next block
        // located as the first 3 bytes
        free_next = this.HDD.read(new_addr).slice(this.PNTR_SIZE);
        // Update the mbr
        mbr_data.replace(alloc, free_next);
        // Write the data to update the mbr
        this.HDD.write(this.MBR, mbr_data);
        // Update the pointer data at alloc to be INVALID_PNTR
        this.HDD.write(new_addr, this.INVALID_PNTR);
    }

    return hexToStr(alloc).split('');
};

/**
 * Sets up the file system driver. Will format the disk if it detects that the
 * drive is in an invalid state.
 * 
 * @param HDD
 *            The drive to connect to
 */
FileSystemDeviceDriver.prototype.driverEntry = function( HDD ) {
    // set the HDD
    this.HDD = HDD;
    // See if it needs to be formated
    var MBR_DATA = this.HDD.read(this.MBR);
    var secret = MBR_DATA.slice(0, this.MBR_HEADER.length);
    if ( secret != this.MBR_HEADER ) {
        this.format();
    }

    this.status = "loaded";
};
