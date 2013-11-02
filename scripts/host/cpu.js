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

/**
 * Generates a new CPU
 * 
 * @param display_fn
 *            An optional function for displaying the CPU state. This will be
 *            called with no arguments. The function is expected to look at the
 *            CPU internals and make a decision on what to do.
 * 
 */
function CPU(display_fn) {
    this.PC = 0; // Program Counter
    this.Acc = 0; // Accumulator
    this.Xreg = 0; // X register
    this.Yreg = 0; // Y register
    this.Zflag = 0; // Z-ero flag (Think of it as "isZero".)
    this.isExecuting = false;

    // Kernel-supplied memory read-write handles
    this.read = undefined;
    this.write = undefined;
    // Kernel-supplied interrupt generators
    this.interrupt = undefined;
    // Kernel-supplied tracing
    this.trace = undefined;

    // Host-supplied display-update function
    this.display = display_fn;

    // CPU defined interrupt requests
    // Generates on program exit
    this.PROG_EXIT_IRQ = 5;
    // Generates on invalid instruction with argument 0
    this.SW_FATAL_IRQ = 4;
    // Generates on timer == 0
    this.TIMER_IRQ = 7;
    // Generates when instruction == FF
    this.SYS_CALL_IRQ = 3;
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

        this.Acc = hexToDec(this.read(addr));
        this.PC_INC(3);
    };

    // STA -- store acc to addr
    this['8D'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        this.write(addr, decToHex(this.Acc));
        this.PC_INC(3);
    };

    // ADC -- add with carry addr to Acc
    this['6D'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        this.Acc = this.Acc + hexToDec(this.read(addr));
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

        this.Xreg = hexToDec(this.read(addr));

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

        this.Yreg = hexToDec(this.read(addr));
        this.PC_INC(3);
    };

    // NOP --
    this['EA'] = function(databits) {
        // do nothing
        this.PC_INC(1);
    };

    // BRK -- BREAK: execution exit
    this['00'] = function(databits) {
        this.interrupt(this.PROG_EXIT_IRQ);
    };

    // CPX -- compare Xreg to data in mem
    this['EC'] = function(databits) {
        var addr = databits.join('');
        addr = hexToDec(addr);

        this.Zflag = (this.Xreg === hexToDec(this.read(addr)));
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

        var nv = hexToDec(this.read(addr)) + 1;

        // It's only a byte, so rollover if > 255
        nv = nv % 256;

        this.write(addr, decToHex(nv));

        this.PC_INC(3);
    };

    // SYS -- system call
    this['FF'] = function(databits) {
        this.interrupt(this.SYS_CALL_IRQ);
        this.PC_INC(1);
    };
}

CPU.prototype.cycle = function() {
    if (this.trace)
        this.trace("CPU cycle");

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
        this.interrupt(this.SW_FATAL_IRQ, 0);
        this.isExecuting = false;
    }
    if (this.display)
        this.display();

    --this.timer;

    if (this.timer <= 0) {
        // timer ended
        this.interrupt(this.TIMER_IRQ);
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
        data[i] = this.read(cbyte);
        ++cbyte;
    }

    return data;
};

/**
 * Hooks up a kernel to this CPU
 * 
 * @param interrupt_generator
 *            A kernel function that will handle interrupt generation. The CPU
 *            will supply the following interrupts: PROG_EXIT (no arguments)
 *            when a program exits. SW_FATAL argument: 0 when an invalid opcode
 *            is encountered. TIMER when the cpu-internal timer hits 0. SYS_CALL
 *            when the instruction 0xFF is encountered.
 * @param mem_read
 *            A function that allows memory access/reading
 * @param mem_write
 *            A function that allows memory writing
 * @param tracer
 *            A function that prints tracing information, because CPUs do that?
 */
CPU.prototype.hook = function(interrupt_generator, mem_read, mem_write, tracer) {
    this.read = mem_read;
    this.write = mem_write;
    this.interrupt = interrupt_generator;
    this.trace = tracer;
};
