/*
 * Contains code for the short-term and long-term scheduler
 * 
 * TODO Implement long-term scheduler w/ swapping
 */

/**
 * Short-term scheduler class
 */

function STS(kernel) {
    // Hookup the API
    this.kernel = kernel;

    // Nothing to set this too yet, but why not have it
    this.mode = 'RoundRobin';

    // Default is 6 clock ticks/switch
    this.DEFAULT_QUANTUM = 6;

    this.quantum = this.DEFAULT_QUANTUM;
};

// Make a scheduling decision
STS.prototype.decide = function() {
    if (!this.kernel.activeProcess || this.mode === 'RoundRobin') {
        // No process running, or our quantum was triggered
        this.kernel.trace("RR Switch");
        // The quantum says to switch
        if (this.kernel.readyQueue.getSize() > 0) {
            // There is a program to switch to
            // Set up the context switch
            var params = [ this.kernel.readyQueue.dequeue() ];
            this.kernel.queueInterrupt(this.kernel.CTXT_SWITCH_IRQ, params);
        }
        // Tell the CPU how many cycles to wait before eviction
        this.kernel.CPU.timer = this.quantum;
    }
};
