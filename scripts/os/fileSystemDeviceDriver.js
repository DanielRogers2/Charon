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
 * Each DATA block contains the following, no separation: pointer_to_next_data,
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

    // Data stored per block
    this.DATA_PER_BLOCK = undefined;

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

    // Set maximum number of characters in a file name
    // Need enough room for an EOF + two pointers
    this.MAX_FNAME_SIZE = this.HDD.BLOCK_SIZE * 2 - this.EOF.length
            - this.FNAME_START_OFFSET;

    // Data stored per block
    // Need enough room for an EOF + 1 pointer
    this.DATA_PER_BLOCK = this.HDD.BLOCK_SIZE * 2 - this.EOF.length
            - this.DATA_OFFSET;

    // Enumerate the files
    this.enumerateFiles();

    if ( DEBUG ) {

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

        this.write([ 1, 0, 0 ], strToHex("this is a really long string"
                + " holy shit not really kindof"));
        console.log(hexToStr(this.read([ 1, 0, 0 ])));

        this.write([ 1, 0, 0 ], strToHex("how was that exactly two blocks idk,"
                + " oh it was a bug yeah"));
        console.log(hexToStr(this.read([ 1, 0, 0 ])));

        // Should succeed
        console.log(this.deleteFile(hexToStr("DEADBEEF")));

        // Should be {}
        console.log(this.file_list);

        // Should succeed
        console.log(this.createFile(hexToStr("DEADBEEF")));
        // Should print nothing
        console.log(hexToStr(this.read([ 1, 0, 0 ])));

        // Should contain hexToStr(DEADBEEF) : first_data_block
        console.log(this.file_list);

        // Should be the next index & successful
        var indx = this.allocate(true);
        console.log(indx);
        // Should restore state of disk
        this.free(indx, true);

        // Should say success
        console.log(this.writeFile(hexToStr("DEADBEEF"), hexToStr("DEADBEEF")));

        // Should fail, file not found
        console.log(this.writeFile(hexToStr("FFFFFF"), hexToStr("DEADBEEF")));

        // should come back true, DEADBEEF
        console.log(this.readFile(hexToStr("DEADBEEF")));

        // Should fail, file not found
        console.log(this.readFile(hexToStr("FFFFFF")));

        // should work
        console.log(this.deleteFile(hexToStr("DEADBEEF")));

        // Should be {}
        console.log(this.file_list);
    }

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

    // Everything is okay at this point, write pointer to free data block
    // + file name followed by EOF
    // Store first_index, so we preserve the linked list, with this as the new
    // head
    this.HDD.write(new_indx, first_indx + hex_data_indx + hex_fname + this.EOF);

    // Update file list
    this.file_list[fname] = { };
    this.file_list[fname].index_ptr = new_indx;
    this.file_list[fname].data_ptr = data_indx;

    // Update the MBR to point to this as the first directory
    mbr_data = mbr_data.replace(first_indx, hex_nindx);
    // Write the data to update the mbr
    this.HDD.write(this.MBR, mbr_data);

    return "success";
};

/**
 * Writes to a file
 * 
 * @param fname
 *            The file to write to
 * @param data
 *            The string data to write
 * 
 * @return A status message, one of: "success", "failed, no space", "failed, no
 *         such file"
 */
FileSystemDeviceDriver.prototype.writeFile = function( fname, data ) {
    // First check if there's a file by that name
    if ( !this.fileExists(fname) ) {
        return "failed, no such file";
    }

    // Then get the address of the file's data blocks
    var w_addr = this.file_list[fname].data_ptr;
    // Convert data to hex
    var hex_data = strToHex(data);

    // Then do the write
    var w_success = this.write(w_addr, hex_data);

    if ( !w_success ) {
        return "failed, no space";
    }

    return "success";
};

/**
 * Reads a file
 * 
 * @param fname
 *            The file to read from
 * 
 * @return a map containing {success: <true|false>, data: <filedata|message>} A
 *         status of true indicates a successful read, and data will be the hex
 *         data in the file. A status of false is a bad read, and data will be
 *         the error message.
 */
FileSystemDeviceDriver.prototype.readFile = function( fname ) {
    var res =
    {
        success : false,
        data : 'File not found'
    };

    // Check if the file exists
    if ( !this.fileExists(fname) ) {
        return res;
    }

    // Get the pointer to the file data, an easy lookup
    var dstart = this.file_list[fname].data_ptr;

    // Read the data into data
    res.data = this.read(dstart);

    // Flag OK
    res.success = true;

    return res;
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
    var findex = this.file_list[fname].index_ptr;
    // Get the index of the first data block
    var index_set = this.file_list[fname].data_ptr;

    // Free the data blocks
    this.del(index_set);

    // Get the pointer to the next directory entry
    var nxt_dir = this.HDD.read(findex).slice(this.FILENEXT_OFFSET,
            this.FILENEXT_OFFSET + this.PNTR_SIZE);

    // Update the MBR to use nxt_dir as the new directory head
    var mbr_data = this.HDD.read(this.MBR);
    // Replace old index with next index
    mbr_data = mbr_data.replace(strToHex(findex.join('')), nxt_dir);
    // Write it to the hard drive
    this.HDD.write(this.MBR, mbr_data);

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
        data += cur_data.slice(this.DATA_OFFSET, this.EOFIndex(cur_data));

        // Get the next set of track, sector, block
        index_set = hexToStr(cur_index).split('');
    }

    return data;
};

/**
 * Writes a contiguous block of data starting at an address. Will rollback
 * changes if unsuccessful
 * 
 * @param addr
 *            The start address to write to
 * @param data
 *            The HEX data string to write
 * @return true if the write succeeded
 */
FileSystemDeviceDriver.prototype.write = function( addr, data ) {
    var datasets = [ ];
    var block_indexes = [ ];

    // Create blocks of maximum data block size
    for ( var i = 0; i < data.length; i += this.DATA_PER_BLOCK ) {
        datasets.push(data.slice(i, i + this.DATA_PER_BLOCK));
    }

    // Allocate all the blocks needed
    // First get all the current blocks, to see if more are needed
    var index_set = addr;
    var cur_index, cur_data;

    cur_index = strToHex(index_set.join(''));

    while ( cur_index != this.INVALID_PNTR ) {
        // Record the block index
        block_indexes.push(index_set);

        // Get the data
        cur_data = this.HDD.read(index_set);

        // Extract pointer to next
        cur_index = cur_data.slice(this.DATANEXT_OFFSET, this.PNTR_SIZE);

        // Get the next set of track, sector, block
        index_set = hexToStr(cur_index).split('');
    }

    var spareblocks = block_indexes.length - datasets.length;

    // See if we need to allocate more
    if ( spareblocks < 0 ) {
        // Try to allocate more data
        var allocd_blocks = [ ];
        var block, success;
        success = true;

        // Do the allocation
        for ( var i = 0; i < ( -spareblocks ); ++i ) {
            block = this.allocate(false);
            // Check for no more memory
            if ( strToHex(block.join('')) == this.INVALID_PNTR ) {
                // uh-oh
                success = false;
                break;
            }
            else {
                allocd_blocks.push(block);
            }
        }

        // Allocation failed, free blocks
        if ( !success ) {
            for ( var i = 0; i < allocd_blocks.lengh; ++i ) {
                this.free(allocd_blocks[i], false);
            }
            // =(
            return false;
        }
        // Allocation successful, add to blockindexes
        else {
            for ( var i = 0; i < allocd_blocks.length; ++i ) {
                block_indexes.push(allocd_blocks[i]);
            }
        }
    }
    // See if we need to free up data blocks
    else if ( spareblocks > 0 ) {
        // Free the blocks at the end
        for ( var i = block_indexes.length - spareblocks; i < block_indexes.length; ++i ) {
            this.free(block_indexes[i], false);
        }
        // Trim the array
        block_indexes = block_indexes.slice(0, block_indexes.length
                - spareblocks);
    }

    // Set the last index to invalid index
    block_indexes.push(hexToStr(this.INVALID_PNTR).split(''));

    // Yay, the mess above is already taken care of, now just write the data...
    var hexaddr;

    for ( var i = 0; i < block_indexes.length - 1; ++i ) {
        // Write @ location: pntr_to_next + data + EOF
        // Since block_indexes[-1] == 777, we won't have to manually mark end of
        // chain
        hexaddr = strToHex(block_indexes[i + 1].join(''));
        this.HDD.write(block_indexes[i], hexaddr + datasets[i] + this.EOF);
    }

    return true;
};

/**
 * De-allocates a contiguous set of data blocks
 * 
 * @param addr
 *            The start address
 */
FileSystemDeviceDriver.prototype.del = function( addr ) {
    var index_set = addr;
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
 * Checks if the drive is formatted (probably)
 * 
 * @return true if the fSDD thinks the drive is formatted
 */
FileSystemDeviceDriver.prototype.isFormatted = function( ) {

    //Get MBR data
    var MBR_DATA = this.HDD.read(this.MBR);
    //Look for secret string
    var secret = MBR_DATA.slice(0, this.MBR_HEADER.length);

    return secret != this.MBR_HEADER;
};

/**
 * Gets the index of EOF from a hex string
 * 
 * @param hex
 *            The hex string to look for EOF in
 * @return -1 if not found, otherwise the index of the string
 * 
 */
FileSystemDeviceDriver.prototype.EOFIndex = function( hex ) {
    // Convert data into 2byte sets
    var getbytes = function( hex ) {
        var data = [ ];
        hex = hex.split('');
        for ( var i = 0; i < hex.length; i += 2 ) {
            data[i / 2] = hex.slice(i, i + 2).join('');
        }

        return data;
    };

    // Multiply by two, since outside is looking at single characters and not
    // bytes
    return 2 * getbytes(hex).indexOf(this.EOF);
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
        cur_name = cur_data.slice(this.FNAME_START_OFFSET, this
                .EOFIndex(cur_data));
        // Get the file's first block of data
        fdata_ptr = hexToStr(
                cur_data.slice(this.FILEDATA_PNTR_OFFSET,
                        this.FILEDATA_PNTR_OFFSET + this.PNTR_SIZE)).split('');

        this.file_list[hexToStr(cur_name)] = { };
        this.file_list[hexToStr(cur_name)].index_ptr = indx_set;
        this.file_list[hexToStr(cur_name)].data_ptr = fdata_ptr;

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

    // this would be really bad if it happened
    // IF
    if ( hex_addr == this.INVALID_PNTR ) {
        return;
    }

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

        // If it's an index file, need two invalid pointers for next_index
        // & data start
        var basedata = ( index ) ? this.INVALID_PNTR : '';
        basedata += this.INVALID_PNTR + this.EOF;

        // Update the pointer data at alloc to be INVALID_PNTR
        this.HDD.write(new_addr, basedata);
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
