/* ------------  
   CPU.js

   Requires global.js.

   Routines for the host CPU simulation, NOT for the OS itself.  
   In this manner, it's A LITTLE BIT like a hypervisor,
   in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
   that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
   JavaScript in both the host and client environments.

   This code references page numbers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

function Cpu() {
    this.PC = 0; // Program Counter
    this.Acc = 0; // Accumulator
    this.Xreg = 0; // X register
    this.Yreg = 0; // Y register
    this.Zflag = 0; // Z-ero flag (Think of it as "isZero".)
    this.isExecuting = false;

    this.init = function() {
        this.PC = 0;
        this.Acc = 0;
        this.Xreg = 0;
        this.Yreg = 0;
        this.Zflag = 0;
        this.isExecuting = false;
    };

    this.cycle = function() {
        krnTrace("CPU cycle");
        // TODO: Accumulate CPU usage and profiling statistics here.
        // Do the real work here. Be sure to set this.isExecuting appropriately.
        // Fetch
        var data = this.FETCH();
        // Decode
        var op = data[0];
        //data is stored with high-byte in low memory (why??)
        var databits = data.slice(1).reverse();
        // Execute instruction
        this[op](databits);
    };

    // Utility functions

    // Increment the program counter by the correct number of bytes
    this.PC_INC = function(bytes) {
        // Convert and do increment
        var decimalPC = hexToDec(this.PC);
        // Programs only get 256bytes of memory -- 0-255
        decimalPC = (decimalPC + bytes) % 256;

        this.PC = decToHex(decimalPC);
    };

    // Fetch instruction
    // returns an array containing hex data for the instruction
    // [opcode byte, databyte1, databyte2, ...]
    this.FETCH = function() {
        var data = [];
        var decimalPC = hexToDec(this.PC);
        
        // Opcodes use a max of 3 bytes
        for ( var i = 0; i < 3; ++i) {
            // read in all bytes
            data[i] = _MMU.read(decimalPC);
            ++decimalPC;
        }

        return data;
    };

    // CPU Instruction

    // Databits argument is the rest of the bits following the opcode expressed
    // as an array of 2-value hex digits
    // LDA with constant
    this.A9 = function(databits) {
        this.Acc = databits[0];
        this.PC_INC(2);
    };

    // LDA from mem
    this.AD = function(databits) {
        //Get full address
        var addr = databits.join('');
        //convert to decimal for read()
        addr = hexToDec(addr);
        
        this.Acc = _MMU.read(addr);
        this.PC_INC(3);
    };

}
