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
        //data is stored with high-byte in low memory
        var databits = data.slice(1).reverse();

        if(op in this) {
            // Execute instruction
            this[op](databits);
        }
        else {
            _KernelInterruptQueue.enqueue(new Interrupt(SW_FATAL_IRQ, [0]));
            _CPU.isExecuting = false;
        }
        this.updateDisplay();
    };

    // Utility functions

    // Increment the program counter by the correct number of bytes
    this.PC_INC = function(bytes) {
        // Programs only get 256bytes of memory -- 0-255
        this.PC = (this.PC + bytes) % 256;
    };

    // Fetch instruction
    // returns an array containing hex data for the instruction
    // [opcode byte, databyte1, databyte2, ...]
    this.FETCH = function() {
        var data = [];

        var cbyte = this.PC;

        // Opcodes use a max of 3 bytes
        for ( var i = 0; i < 3; ++i) {
            // read in all bytes
            data[i] = _MMU.read(cbyte);
            ++cbyte;
        }

        return data;
    };

    // CPU Instruction

    // Databits argument is the rest of the bits following the opcode
    //      expressed as an array of 2-value hex digits
    // LDA -- load Acc with constant
    this['A9'] = function(databits) {
        this.Acc = hexToDec(databits[1]);
        this.PC_INC(2);
    };

    // LDA -- load Acc from mem
    this['AD'] = function(databits) {
        //Get full address
        var addr = databits.join('');
        //convert to decimal for read()
        addr = hexToDec(addr);

        this.Acc = hexToDec(_MMU.read(addr));
        this.PC_INC(3);
    };

    // STA -- store acc to addr
    this['8D'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        _MMU.write(addr, decToHex(this.Acc));
        this.PC_INC(3);
    };

    // ADC -- add with carry addr to Acc
    this['6D'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        this.Acc = this.Acc + hexToDec(_MMU.read(addr));

        this.PC_INC(3);
    };

    // LDX -- load Xreg with const
    this['A2'] = function(databits) {
        this.Xreg = hexToDec(databits[1]);
        this.PC_INC(2);
    };

    // LDX -- load Xreg from mem
    this['AE'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        this.Xreg = hexToDec(_MMU.read(addr));
        
        this.PC_INC(3);
    };

    // LDY -- load Yreg with const
    this['A0'] = function(databits) {
        this.Yreg = hexToDec(databits[1]);
        this.PC_INC(2);
    };

    // LDY -- load Yreg from mem
    this['AC'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        this.Yreg = hexToDec(_MMU.read(addr));
        this.PC_INC(3);
    };

    // NOP --
    this['EA'] = function(databits) {
        //do nothing
        this.PC_INC(1);
    };

    // BRK -- BREAK: execution exit
    this['00'] = function(databits) {
        _KernelInterruptQueue.enqueue(new Interrupt(PROG_EXIT, []));
    };

    // CPX -- compare Xreg to data in mem
    this['EC'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        this.Zflag = (this.Xreg == hexToDec(_MMU.read(addr)));
        this.PC_INC(3);
    };

    // BNE -- branch if Zflag == 0
    this['D0'] = function(databits) {
        if(this.Zflag == 0) {
            var jmpBytes = hexToDec(databits[1]);

            this.PC_INC(jmpBytes + 2);
        }
        else {
            this.PC_INC(2);
        }

    };

    // INC -- increment value of byte in mem
    this['EE'] = function(databits) {
        var addr = hexToDec(databits.join(''));

        var nv = hexToDec(_MMU.read(addr)) + 1;
        _MMU.write(addr, decToHex(nv));

        this.PC_INC(3);
    };

    // SYS -- system call
    this['FF'] = function(databits) {
        _KernelInterruptQueue.enqueue(new Interrupt(SYS_IRQ, []));

        this.PC_INC(1);
    };

    //Update HTML element display for cpu
    this.updateDisplay = function() {
        document.getElementById("PC1").innerHTML    = "0x" + decToHex(this.PC);
        document.getElementById("ACC1").innerHTML   = "0x" + decToHex(this.Acc);
        document.getElementById("XReg1").innerHTML  = "0x" + decToHex(this.Xreg);
        document.getElementById("YReg1").innerHTML  = "0x" + decToHex(this.Yreg);
        document.getElementById("ZFlag1").innerHTML = "0x" + decToHex(this.Zflag);
    };

}
