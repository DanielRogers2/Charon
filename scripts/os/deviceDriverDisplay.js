/*
 * Handles drawing to the canvases
 * 
 */

DeviceDriverDisplay.prototype = new DeviceDriver;

/**
 * Generates a new display device driver, call driverEntry to initialize
 * 
 * @returns {DeviceDriverDisplay}
 */
function DeviceDriverDisplay( ) {
}

/**
 * Draw Screen buffer to canvas
 * 
 * @param params
 *            [canvasID, screenBuffer]
 */
DeviceDriverDisplay.prototype.isr = function( params ) {
    var canvasID = params[0];
    var args = params[1];

    var canvas = this.screens[canvasID];
    var context = this.contexts[canvasID];
    context.font = _DefaultFontFamily;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // use .apply to invoke function on Canvas with arguments
    context.drawImage(args, 0, 0);
};

/**
 * Sets up the device driver for drawing
 * 
 * @param screens
 *            The screens that the driver will draw to, the driver will look up
 *            the screens and contexts by ID when asked to service a draw
 *            request.
 * @param drawingapis
 *            The same as above, but pointers to the drawing contexts for the
 *            screens.
 */
DeviceDriverDisplay.prototype.driverEntry = function( screens, drawingapis ) {
    this.screens = screens;
    this.contexts = drawingapis;
    this.status = "loaded";
};
