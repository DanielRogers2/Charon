/*
 * Contains code for the short-term and long-term scheduler
 * 
 * TODO Implement long-term scheduler w/ swapping
 */

/**
 * Short-term scheduler class
 * 
 * @param readyQueue
 *            A program ready queue storing processes waiting to be executed
 * @param ctxt_switch_handler
 *            A function that handles context switches. The scheduler will pass
 *            in the program that should be switched to.
 * @param timer_updater
 *            A function that handles updating a timer. STS.decide() should be
 *            called whenever the timer hits
 * @param tracer
 *            An optional function to handle tracing messages
 */
function STS(readyQueue, ctxt_switch_handler, timer_updater, tracer) {
    // Hookup the API
    this.readyQueue = readyQueue;
    this.contextSwitchHandler = ctxt_switch_handler;
    this.updateTimer = timer_updater;
    this.trace = tracer;

    // Nothing to set this too yet, but why not have it
    this.mode = 'RoundRobin';

    // Default is 6 clock ticks/switch
    this.DEFAULT_QUANTUM = 6;

    this.quantum = this.DEFAULT_QUANTUM;
};

// Make a scheduling decision
STS.prototype.decide = function() {
    if (this.mode === 'RoundRobin') {
        // No process running, or our quantum was triggered
        if (this.trace)
            this.trace("RR Switch");
        
        // The quantum says to switch
        if (this.readyQueue.getSize() > 0) {
            // There is a program to switch to
            // Set up the context switch
            this.contextSwitchHandler(this.readyQueue.dequeue());
        }
        // Set the timer to next decision
        this.updateTimer(this.quantum);
    }
};
