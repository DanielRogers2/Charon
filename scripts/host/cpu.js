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

function CPU(host) {
    this.PC = 0; // Program Counter
    this.Acc = 0; // Accumulator
    this.Xreg = 0; // X register
    this.Yreg = 0; // Y register
    this.Zflag = 0; // Z-ero flag (Think of it as "isZero".)
    this.isExecuting = false;

    this.kernel = undefined;
    this.host = host;
    this.timer = 0;

    // CPU Instruction
    // Databits argument is the rest of the bits following the opcode
    // expressed as an array of 2-value hex digits
    // LDA -- load Acc with constant
    this['A9'] = function(databits) {
        this.Acc = hexToDec(databits[1]);
        this.PC_INC(2);
    };

    // LDA -- load Acc from mem
    this['AD'] = function(databits) {
        // Get full address
        var addr = databits.join('');
        // convert to decimal for read()
        addr = hexToDec(addr);

        this.Acc = hexToDec(this.kernel.MMU.read(addr));
        this.PC_INC(3);
    };

    // STA -- store acc to addr
    this['8D'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        this.kernel.MMU.write(addr, decToHex(this.Acc));
        this.PC_INC(3);
    };

    // ADC -- add with carry addr to Acc
    this['6D'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        this.Acc = this.Acc + hexToDec(this.kernel.MMU.read(addr));
        // wrap to the value of a single byte
        this.Acc %= 256;

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

        this.Xreg = hexToDec(this.kernel.MMU.read(addr));

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

        this.Yreg = hexToDec(this.kernel.MMU.read(addr));
        this.PC_INC(3);
    };

    // NOP --
    this['EA'] = function(databits) {
        // do nothing
        this.PC_INC(1);
    };

    // BRK -- BREAK: execution exit
    this['00'] = function(databits) {
        this.kernel.queueInterrupt(this.kernel.PROG_EXIT, []);
    };

    // CPX -- compare Xreg to data in mem
    this['EC'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        this.Zflag = (this.Xreg === hexToDec(this.kernel.MMU.read(addr)));
        this.Zflag = (this.Zflag) ? 1 : 0;

        this.PC_INC(3);
    };

    // BNE -- branch if Zflag === 0
    this['D0'] = function(databits) {
        if (this.Zflag === 0) {
            var jmpBytes = hexToDec(databits[1]);

            this.PC_INC(jmpBytes + 2);
        } else {
            this.PC_INC(2);
        }

    };

    // INC -- increment value of byte in mem
    this['EE'] = function(databits) {
        var addr = hexToDec(databits.join(''));

        var nv = hexToDec(this.kernel.MMU.read(addr)) + 1;

        // It's only a byte, so rollover if > 255
        nv = nv % 256;

        this.kernel.MMU.write(addr, decToHex(nv));

        this.PC_INC(3);
    };

    // SYS -- system call
    this['FF'] = function(databits) {
        this.kernel.queueInterrupt(this.kernel.SYS_IRQ, []);
        this.PC_INC(1);
    };
}

CPU.prototype.cycle = function() {
    this.kernel.trace("CPU cycle");
    // TODO: Accumulate CPU usage and profiling statistics here.
    // Do the real work here. Be sure to set this.isExecuting appropriately.
    // Fetch
    var data = this.FETCH();
    // Decode
    var op = data[0];
    // data is stored with high-byte in low memory
    var databits = data.slice(1).reverse();

    if (op in this) {
        // Execute instruction
        this[op](databits);
    } else {
        // Invalid opcode
        this.kernel.queueInterrupt(this.kernel.SW_FATAL_IRQ, [ 0 ]);
        this.isExecuting = false;
    }
    this.host.updateCPUDisplay();
    --this.timer;

    if (this.timer <= 0) {
        // timer ended
        this.kernel.queueInterrupt(this.kernel.CPU_TIMER_IRQ, []);
    }
};

// Increment the program counter by the correct number of bytes
CPU.prototype.PC_INC = function(bytes) {
    // Programs only get 256bytes of memory -- 0-255
    this.PC = (this.PC + bytes) % 256;
};

// Fetch instruction
// returns an array containing hex data for the instruction
// [opcode byte, databyte1, databyte2, ...]
CPU.prototype.FETCH = function() {
    var data = [];

    var cbyte = this.PC;

    // Opcodes use a max of 3 bytes
    for ( var i = 0; i < 3; ++i) {
        // read in all bytes
        data[i] = this.kernel.MMU.read(cbyte);
        ++cbyte;
    }

    return data;
};
