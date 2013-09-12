/* ------------
   Console.js

   Requires globals.js

   The OS Console - stdIn and stdOut by default.
   Note: This is not the Shell.  The Shell is the "command line interface" (CLI) or interpreter for this console.
   ------------ */

function CLIconsole() {
    // Properties
    this.CurrentFont      = _DefaultFontFamily;
    this.CurrentFontSize  = _DefaultFontSize;
    this.CurrentXPosition = 0;
    this.CurrentYPosition = this.CurrentFontSize;
    this.buffer = "";

    // Methods
    this.init = function() {
        this.clearScreen();
        this.resetXY();
    };

    this.clearScreen = function() {
        _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
    };

    this.resetXY = function() {
        this.CurrentXPosition = 0;
        this.CurrentYPosition = this.CurrentFontSize;
    };

    this.handleInput = function() {
        while (_KernelInputQueue.getSize() > 0)
        {
            // Get the next character from the kernel input queue.
            var chr = _KernelInputQueue.dequeue();
            // Check to see if it's "special" (enter or ctrl-c) 
            //   or "normal" (anything else that the keyboard device driver gave us).
            if (chr == String.fromCharCode(13))  //     Enter key
            {
                // The enter key marks the end of a console command, so ...
                // ... tell the shell ...
                _OsShell.handleInput(this.buffer);
                // ... and reset our buffer.
                this.buffer = "";
            }
            else if (chr == String.fromCharCode(8) &&
                    this.buffer.length > 0         &&
                    (this.CurrentXPosition > 0      ||
                            this.CurrentYPosition > 0) ) //backspace
            {
                //get last character
                var lc = this.buffer[this.buffer.length-1];
                var charwidth = _DrawingContext.measureText(lc).width;

                if(DEBUG === true) {
                    console.log("erasing size: (" + charwidth + ")");
                }

                //move back current position
                this.CurrentXPosition -= charwidth;

                //see if we need to move back a line
                if(this.CurrentXPosition < 0) {
                    //handle if _Canvas.width not a multiple of charwidth
                    var charsprln = Math.floor(_Canvas.width / charwidth) - 1;

                    //set position to end of previous line
                    this.CurrentXPosition = charsprln * charwidth;
                    this.CurrentYPosition -= (_DefaultFontSize + _FontHeightMargin);
                }

                //clear character box from canvas
                _DrawingContext.clearRect(this.CurrentXPosition
                        , this.CurrentYPosition - _DefaultFontSize
                        , this.CurrentXPosition + charwidth
                        //make sure to clear out letters below the line like p,j
                        , this.CurrentYPosition + _FontHeightMargin);

                //remove last character from buffer
                this.buffer = this.buffer.slice(0, this.buffer.length - 1); 
            }
            // TODO: Write a case for Ctrl-C.
            else
            {
                // This is a "normal" character, so ...
                // ... draw it on the screen...
                this.putText(chr);
                // ... and add it to our buffer.
                this.buffer += chr;
            }

            if(DEBUG === true) {
                console.log("buffer: " + this.buffer);
            }
        }
    };

    this.putText = function(text) {
        // My first inclination here was to write two functions: putChar() and putString().
        // Then I remembered that JavaScript is (sadly) untyped and it won't differentiate
        // between the two.  So rather than be like PHP and write two (or more) functions that
        // do the same thing, thereby encouraging confusion and decreasing readability, I
        // decided to write one function and use the term "text" to connote string or char.
        if(DEBUG === true) {
            console.log("handling: " + text);
        }

        for(var i = 0; i < text.length; ++i) {
            
            //check where X position of text end will be
            var offset = _DrawingContext.measureText(text[i]).width;
            if(this.CurrentXPosition + offset > _Canvas.width) {
                //wrap line
                this.advanceLine();
            }

            // Draw the text at the current X and Y coordinates.
            _DrawingContext.fillText(text[i], this.CurrentXPosition, this.CurrentYPosition);
            // Move the current X position.
            this.CurrentXPosition = this.CurrentXPosition + offset;

            if(DEBUG === true) {
                console.log("moved x,y to: (" + this.CurrentXPosition + ", " + this.CurrentYPosition + ")");
            }

        }
    };

    this.advanceLine = function() {
        this.CurrentXPosition = 0;
        this.CurrentYPosition += _DefaultFontSize + _FontHeightMargin;

        //clip top line of canvas and redraw
        if(this.CurrentYPosition >= _Canvas.height) {
            //buffer canvas to hold old canvas during canvas clear
            var backBuffer = document.createElement('canvas');
            backBuffer.height = _Canvas.height;
            backBuffer.width  = _Canvas.width;

            //clip one line from top
            var clip = (_DefaultFontSize + _FontHeightMargin);
            var bufferDraw = backBuffer.getContext('2d');

            if(DEBUG === true) {
                console.log("clip size: " + clip);
            }
            //write image to buffer canvas
            //you can also clip images, but this was resulting in type errors
            //this was easier
            bufferDraw.drawImage(_Canvas, 0, -clip);

            //wipe the canvas
            this.clearScreen();

            //restore canvas with clipped data
            _DrawingContext.drawImage(backBuffer, 0, 0);
            //we didn't advance the cursor really, so reset it. 
            //Otherwise we'll keep on clearing the screen (which is bad)
            this.CurrentYPosition -= clip;
        }
    };
}
