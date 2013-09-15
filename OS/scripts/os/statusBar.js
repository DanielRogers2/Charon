/*
 * Handles the 'taskbar' portion of the program
 */
function StatusBar (canvasID) {
    // Properties
    this.CurrentFont     = _DefaultFontFamily;
    this.CurrentFontSize = _DefaultFontSize;
    this.timeBoxStart    = 350;
    this.YPosition       = this.CurrentFontSize;

    this.canvasID = canvasID;

    this.screenBuffer        = document.createElement('canvas');
    this.screenBuffer.width  = _Canvases[this.canvasID].width;
    this.screenBuffer.height = _Canvases[this.canvasID].height;

    this.drawingContext      = this.screenBuffer.getContext('2d');
    this.drawingContext.font = _DefaultFontFamily;

    this.status = [];
    this.currentLine = 0;

    this.lastStatus = [""];

    this.lastTime = "";
    this.lastDay = "";

    this.clock = new Clock();

    this.init = function (date) {
        this.updateStatus("This is Ground Control, you've really made the grade.");
        this.updateTime(date);
    };

    this.updateTime = function (date) {

        if(DEBUG == true) {
            console.log("updating using: " + date);
        }
        //get new time
        var nt = this.clock.getTimeString(date);
        var nd = this.clock.getShortDate(date);

        if(nt != this.lastTime 
                || nd != this.lastDay 
                || this.status != this.lastStatus) {

            this.lastTime = nt;
            this.lastDay = nd;
            this.lastStatus = this.status;

            //draw new time/status
            this.drawingContext.clearRect(0, 0, this.screenBuffer.width, this.screenBuffer.height);
            this.drawingContext.fillText(this.status[this.currentLine++], 0, this.YPosition);
            this.drawingContext.fillText(nd + " @ " + nt, this.timeBoxStart, this.YPosition);

            if(this.currentLine == this.status.length) {
                this.currentLine = 0;
            }

            //draw to screen
            var params = [this.canvasID, cloneCanvas(this.screenBuffer)];
            _KernelInterruptQueue.enqueue( new Interrupt(DISPLAY_IRQ, params) );
        }

        //queue up for our next timer update
        _KernelTimedEventQueue.enqueue([this, this.updateTime]);
        _KernelInterruptQueue.enqueue(new Interrupt(TIMER_IRQ, []));
    };

    this.updateStatus = function (newStatus) {
        var words = newStatus.split(" ");
        this.status = [""];
        var l_indx = 0;

        var n_offset = 0;
        var c_offset = 0;

        var max = this.timeBoxStart - this.drawingContext.measureText(" ").width;

        //set up line wrapping if needed
        for(var i = 0; i < words.length; ++i) {
            //check where X position of text end will be
            n_offset = this.drawingContext.measureText(words[i] + " ").width;

            if((n_offset + c_offset) > max) {
                //drawing to next line
                this.status[++l_indx] = "";
                c_offset = 0;
            }

            //build line to be drawn
            this.status[l_indx] += words[i] + " ";
            c_offset += n_offset;
        }

        if(DEBUG == true){
            for(var i = 0; i < this.status.length; ++i) {
                console.log("statuses: " + this.status[i]);
            }

        }

        this.currentLine = 0;
    };

}

