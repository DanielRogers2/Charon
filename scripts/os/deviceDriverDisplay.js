/*
 * Handles drawing to the canvases
 * 
 */

DeviceDriverDisplay.prototype = new DeviceDriver;

function DeviceDriverDisplay( kernel ) {
    this.kernel = kernel;
}

/**
 * Draw Screen buffer to canvas
 * 
 * @param params
 *            [canvasID, Function, screenBuffer]
 */
DeviceDriverDisplay.prototype.isr = function( params ) {
    var canvasID = params[0];
    var args = params[1];

    var canvas = this.kernel.host.screens[canvasID];
    var context = this.kernel.host.contexts[canvasID];
    context.font = _DefaultFontFamily;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // use .apply to invoke function on Canvas with arguments
    context.drawImage(args, 0, 0);
};

DeviceDriverDisplay.prototype.driverEntry = function( ) {
    this.status = "loaded";
};
