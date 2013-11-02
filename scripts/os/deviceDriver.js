/* ------------------------------
   DeviceDriver.js
   
   The "base class" (or 'prototype') for all Device Drivers.
   ------------------------------ */

function DeviceDriver( ) {
    // Base Attributes
    this.version = "0.1";
    this.status = "loaded";
    this.preemptable = false;
    // queued operation on this device.
    // this.queue = new Queue();
}

// Initialization routine. Should be called when
// the driver is loaded.
DeviceDriver.prototype.driverEntry = undefined;
// Interrupt Service Routine
DeviceDriver.prototype.isr = undefined;

// TODO: We will eventually want a queue for,
// well, queueing requests for this device to be handled by deferred
// procedure calls (DPCs).
// TODO: Deferred Procedure Call routine - Start next
DeviceDriver.prototype.dpc = undefined;
