/*
 * Handles drawing to the canvases
 * 
 */

DeviceDriverDisplay.prototype = new DeviceDriver;

function DeviceDriverDisplay () {
    
    
    //Overrides
    this.driverEntry = function () {
        this.status = "loaded";
    };
    
    /*
     * Draw Screen buffer to canvas
     * 
     * params: [canvasID, Function, screenBuffer]
     */
    this.isr = function (params) {
        var canvasID = params[0];
        var args     = params[1];
        
        var canvas = _Canvases[canvasID];
        var context  = _DrawingContexts[canvasID];
        context.font = _DefaultFontFamily;
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        //use .apply to invoke function on Canvas with arguments
        context.drawImage(args, 0, 0);
        
    };
    
}
