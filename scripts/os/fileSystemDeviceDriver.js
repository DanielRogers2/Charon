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
    //Flags an invalid TSB location
    this.INVALID_PNTR = '777';
    //Master boot record location, track0, sector0, block0
    this.MBR = '000';
    //VERY SECRET STRING THAT HOLDS MAGICAL MYSTERIES
    //used to see if the hdd is initialized or not
    this.MBR_HEADER = strToHex("CHARON");
    
    //start of file system index, track0, sector0, block1
    this.FS_INDEX_START = '001';
    //Start of the file data, track1, sector0, block0
    this.DATA_START = '100';
    //Offset into MBR of head pointer to free file indexes
    this.FS_FREE_OFFSET = this.MBR_HEADER.length + 2;
    
    //data @ FS_FREE_OFFSET is TSB value, so do that + a 00 space
    //  For a total of 8 values (6 for TSB + 2 for space)
    this.DATA_FREE_OFFSET = this.FS_FREE_OFFSET + 8;
    
    //EOF marker
    this.EOF = '26';
};
