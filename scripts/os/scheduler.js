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
 * @param priorityQueue
 *            A program ready queue storing processes waiting to be executed,
 *            ordered by priority. The STS assumes that this is kept in sync
 *            with the readyQueue.
 * @param ctxt_switch_handler
 *            A function that handles context switches. The scheduler will pass
 *            in the program that should be switched to.
 * @param timer_updater
 *            A function that handles updating a timer. STS.decide() should be
 *            called whenever the timer hits
 * @param tracer
 *            An optional function to handle tracing messages
 */
function STS( readyQueue, priorityQueue, ctxt_switch_handler, timer_updater,
        tracer ) {
    // Hookup the API
    this.readyQueue = readyQueue;
    this.priorityQueue = priorityQueue;
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
STS.prototype.decide = function( ) {
    if ( this.mode === 'RoundRobin' ) {
        // No process running, or our quantum was triggered
        if ( this.trace )
            this.trace("RR Switch");

        // The quantum says to switch
        if ( this.readyQueue.getSize() > 0 ) {
            // There is a program to switch to
            // Set up the context switch
            this.contextSwitchHandler(this.readyQueue.dequeue());
        }
        // Set the timer to next decision
        this.updateTimer(this.quantum);
    }
    else if ( this.mode === 'FCFS' ) {
        // Never cause a timer trigger
        this.updateTimer(-1);
        if ( this.trace )
            this.trace("FCFS Switch");

        // Do the switch
        if ( this.readyQueue.getSize() > 0 ) {
            this.contextSwitchHandler(this.readyQueue.dequeue());
        }
    }
    else if ( this.mode === 'Priority' ) {
        // Non-preemptive
        this.updateTimer(-1);
        if ( this.trace )
            this.trace("Priority Switch");

        if ( this.priorityQueue.getSize() > 0 ) {
            // Select the next highest priority item and switch to it
            this.contextSwitchHandler(this.priorityQueue.remove());
        }
    }
};
