/*
 * File system driver, for interfacing with the hard drive
 */

FileSystemDeviceDriver.prototype = new DeviceDriver;

/**
 * Creates a new file system driver
 * 
 * STORAGE NOTES:
 * 
 * MBR contains the following, each separated by byte 00: secret_string, pointer
 * to first index, pointer to first free index block, pointer to first free data
 * block.
 * 
 * Each INDEX block contains the following, no separation:
 * pointer_to_next_index, pointer_to_file_data, file_name, EOF
 * 
 * Each DATA blaock contains the following, no separation: pointer_to_next_data,
 * file_data, EOF
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
    this.MBR_INITIAL = this.MBR_HEADER + '00' + this.INVALID_PNTR + '00'
            + strToHex(this.FS_INDEX_START.join('')) + '00'
            + strToHex(this.DATA_START.join(''));

    // Offset into MBR of pointer to first index
    this.FIRST_INDEX_OFFSET = this.MBR_HEADER.length + 2;

    // Offset into MBR of head pointer to free file indexes
    this.FS_FREE_OFFSET = this.FIRST_INDEX_OFFSET + this.PNTR_SIZE + 2;

    // data @ FS_FREE_OFFSET is TSB value, so do that + a 00 space
    // For a total of 8 values (6 for TSB + 2 for space)
    // This marks the head pointer to free data blocks
    this.DATA_FREE_OFFSET = this.FS_FREE_OFFSET + this.PNTR_SIZE + 2;

    // EOF marker, literal value NOT A STRING
    this.EOF = '26';

    // Maximum number of characters in a file name
    this.MAX_FNAME_SIZE = undefined;

    // Offset where filename starts
    this.FNAME_START_OFFSET = 2 * this.PNTR_SIZE;

    // Offset where pointer to next index block starts
    this.FILENEXT_OFFSET = 0;

    // Offset where pointer to file data starts
    this.FILEDATA_PNTR_OFFSET = this.PNTR_SIZE;

    // Offset where pointer to next data block starts
    this.DATANEXT_OFFSET = 0;

    // Offset where file data in block starts
    this.DATA_OFFSET = this.PNTR_SIZE;

    // Enumerated list of files, containing a map of filename :
    // [index_of_filename, index_of_filedata]
    this.file_list = undefined;

    // Hard disk to write to
    this.HDD = undefined;
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

    // Set maximum number of characters in a file name
    // Need enough room for an EOF + two pointers
    this.MAX_FNAME_SIZE = this.HDD.BLOCK_SIZE - this.EOF.length
            - this.FNAME_START_OFFSET;

    // Enumerate the files
    this.enumerateFiles();

    // Should succeed
    console.log(this.createFile(hexToStr("DEADBEEF")));
    // Should fail, file exists
    console.log(this.createFile(hexToStr("DEADBEEF")));
    // Should be the next index & successful
    var indx = this.allocate(true);
    console.log(indx);
    // Should restore state of disk
    this.free(indx, true);

    // Should contain hexToStr(DEADBEEF) : first_data_block
    console.log(this.file_list);

    // Should succeed
    console.log(this.deleteFile(hexToStr("DEADBEEF")));

    // Should be {}
    console.log(this.file_list);

    // Should succeed
    console.log(this.createFile(hexToStr("DEADBEEF")));

    // Should contain hexToStr(DEADBEEF) : first_data_block
    console.log(this.file_list);

    // Should be the next index & successful
    var indx = this.allocate(true);
    console.log(indx);
    // Should restore state of disk
    this.free(indx, true);

    this.status = "loaded";
};

/**
 * Creates a new file with the specified name
 * 
 * @param fname
 *            The file name to create
 * @return message A message indicating creation state. One of "success",
 *         "failed, no space", "failed, file exists", "failed, file name too
 *         long"
 */
FileSystemDeviceDriver.prototype.createFile = function( fname ) {
    // convert to hex
    var hex_fname = strToHex(fname);

    // Check valid file name
    if ( hex_fname.length > this.MAX_FNAME_SIZE ) {
        return "failed, file name too long";
    }

    if ( this.fileExists(fname) ) {
        return "failed, file exists";
    }

    // Now get an index
    var new_indx = this.allocate(true);
    var hex_nindx = strToHex(new_indx.join(''));

    // Check if we could allocate a block of space
    if ( hex_nindx == this.INVALID_PNTR ) {
        return "failed, no space";
    }

    // Allocate 1 block of data
    var data_indx = this.allocate(false);
    var hex_data_indx = strToHex(data_indx.join(''));

    // Check if we could allocate a block of space
    if ( hex_data_indx == this.INVALID_PNTR ) {

        // Free the index block
        this.free(new_indx, true);

        return "failed, no space";
    }

    // MBR DATA HAS CHANGED, REFETCH FROM BACKING STORE
    // oh god bugs
    var mbr_data = this.HDD.read(this.MBR);
    var first_indx = mbr_data.slice(this.FIRST_INDEX_OFFSET,
            this.FIRST_INDEX_OFFSET + this.PNTR_SIZE);

    console.log("MBR OLD INDEX: " + hexToStr(first_indx));

    // Everything is okay at this point, write pointer to free data block
    // + file name followed by EOF
    // Store first_index, so we preserve the linked list, with this as the new
    // head
    this.HDD.write(new_indx, first_indx + hex_data_indx + hex_fname + this.EOF);

    // Update file list
    this.file_list[fname] = [ new_indx, data_indx ];

    // Update the MBR to point to this as the first directory
    mbr_data = mbr_data.replace(first_indx, hex_nindx);
    // Write the data to update the mbr
    this.HDD.write(this.MBR, mbr_data);

    return "success";
};

/**
 * Deletes a file
 * 
 * @param fname
 *            The file name to delete
 * @return message A message indicating creation state. One of "success",
 *         "failed, no such file exists"
 */
FileSystemDeviceDriver.prototype.deleteFile = function( fname ) {
    // Check for the file
    if ( !this.fileExists(fname) ) {
        return "failed, no such file exists";
    }

    // Traverse the file's data blocks, and free each one
    // Files were enumerated by fileExists
    // Get the index of the file
    var findex = this.file_list[fname][0];
    // Get the index of the first data block
    var index_set = this.file_list[fname][1];
    var cur_index, cur_data;

    // Convert for checking
    cur_index = strToHex(index_set.join(''));

    while ( cur_index != this.INVALID_PNTR ) {
        // Get the data
        cur_data = this.HDD.read(index_set);

        // Extract pointer to next
        cur_index = cur_data.slice(this.DATANEXT_OFFSET, this.PNTR_SIZE);

        // Free the current non-index (data) block
        this.free(index_set, false);

        // Get the next set of track, sector, block
        index_set = hexToStr(cur_index).split('');
    }

    // Get the pointer to the next directory entry
    var nxt_dir = this.HDD.read(findex).slice(this.FILENEXT_OFFSET,
            this.FILENEXT_OFFSET + this.PNTR_SIZE);

    // Update the MBR to use nxt_dir as the new directory head
    var mbr_data = this.HDD.read(this.MBR);
    // Replace old index with next index
    mbr_data = mbr_data.replace(strToHex(findex.join('')), nxt_dir);
    // Write it to the hard drive
    this.HDD.write(this.MBR, mbr_data);

    // cry

    // Free the index block
    this.free(findex, true);

    // Delete from local store
    delete this.file_list[fname];

    return "success";
};

/**
 * Reads contiguous blocks of data starting at an address
 * 
 * @param addr
 *            The start address to read from
 * @return <hexdata>
 */
FileSystemDeviceDriver.prototype.read = function( addr ) {
    var data = '';
    // Go through all blocks and read until EOF is encountered

    var index_set = addr;
    var cur_index, cur_data;

    // Convert for checking
    cur_index = strToHex(index_set.join(''));

    while ( cur_index != this.INVALID_PNTR ) {
        // Get the data
        cur_data = this.HDD.read(index_set);

        // Extract pointer to next
        cur_index = cur_data.slice(this.DATANEXT_OFFSET, this.PNTR_SIZE);

        // Read the file data, up to EOF
        data += cur_data.slice(this.DATA_START, cur_data.indexOf(this.EOF));

        // Get the next set of track, sector, block
        index_set = hexToStr(cur_index).split('');
    }

    return data;
};

/**
 * Checks if a file exists
 * 
 * @param fname
 *            The file to look for
 * @return true if it exists
 */
FileSystemDeviceDriver.prototype.fileExists = function( fname ) {
    if ( !this.file_list || this.file_list == { } ) {
        this.enumerateFiles();
    }
    return fname in this.file_list;
};

/**
 * Enumerates a list of all files
 * 
 */
FileSystemDeviceDriver.prototype.enumerateFiles = function( ) {
    // Get the data at the MBR, for lookup
    var mbr_data = this.HDD.read(this.MBR);

    this.file_list = { };

    // Get the first index
    var cur_indx = mbr_data.slice(this.FIRST_INDEX_OFFSET,
            this.FIRST_INDEX_OFFSET + this.PNTR_SIZE);

    // Get the index data
    var indx_set = hexToStr(cur_indx).split('');
    var cur_name, cur_data, fdata_ptr;

    // Traverse list of directory entries
    while ( cur_indx != this.INVALID_PNTR ) {
        // Get the data
        cur_data = this.HDD.read(indx_set);
        // Get the file name, meaning everything past the pointer up to the EOF
        cur_name = cur_data.slice(this.FNAME_START_OFFSET, cur_data
                .indexOf(this.EOF));
        // Get the file's first block of data
        fdata_ptr = hexToStr(
                cur_data.slice(this.FILEDATA_PNTR_OFFSET,
                        this.FILEDATA_PNTR_OFFSET + this.PNTR_SIZE)).split('');

        this.file_list[hexToStr(cur_name)] = [ indx_set, fdata_ptr ];

        // update cur_indx
        cur_indx = cur_data.slice(this.FILENEXT_OFFSET, this.FILENEXT_OFFSET
                + this.PNTR_SIZE);
        indx_set = hexToStr(cur_indx).split('');
    }
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
    var hex_addr = strToHex(addr.join(''));

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
        free_next = this.HDD.read(new_addr).slice(0, this.PNTR_SIZE);
        // Update the mbr
        mbr_data = mbr_data.replace(alloc, free_next);
        // Write the data to update the mbr
        this.HDD.write(this.MBR, mbr_data);
        // Update the pointer data at alloc to be INVALID_PNTR
        this.HDD.write(new_addr, this.INVALID_PNTR + this.INVALID_PNTR
                + this.EOF);

    }

    return hexToStr(alloc).split('');
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
