/* ------------
   Console.js

   Requires globals.js

   The OS Console - stdIn and stdOut by default.
   Note: This is not the Shell.  The Shell is the "command line interface" (CLI) or interpreter for this console.
   ------------ */

/**
 * Generates a new display console
 * 
 * @param width
 *            The width of the console
 * @param height
 *            The height of the console
 * @param draw_interrupt_generator
 *            A function that will generate an interrupt and render output to a
 *            screen. The generator will be passed a single argument -- a canvas
 *            element representing the screen to render.
 * @param inputQ
 *            A queue containing characters for this console to render
 * @param command_handler
 *            A function to call that will react to the console's character
 *            buffer contents when an enter key is detected.
 */
function CLIconsole( width, height, draw_interrupt_generator, inputQ,
        command_handler ) {
    // Properties
    this.CurrentFont = _DefaultFontFamily;
    this.CurrentFontSize = _DefaultFontSize;
    this.CurrentXPosition = 0;
    this.CurrentYPosition = this.CurrentFontSize;
    this.buffer = "";

    // for kernel related stuff
    this.genDrawInterrupt = draw_interrupt_generator;
    this.inputQ = inputQ;
    this.executeCommand = command_handler;

    // Backing buffer for updates
    this.screenBuffer = document.createElement('canvas');
    this.screenBuffer.width = width;
    this.screenBuffer.height = height;

    this.drawingContext = this.screenBuffer.getContext('2d');
    this.drawingContext.font = _DefaultFontFamily;

    // previously used commands
    this.commandBuffer =
    {
        // stored list
        list : [ ],
        // max list size
        maxLen : 10,
        // currently referenced command
        index : 0

    };

    this.clearScreen();
    this.resetXY();
}

/**
 * Removes all text from the screen
 */
CLIconsole.prototype.clearScreen = function( ) {

    this.drawingContext.clearRect(0, 0, this.screenBuffer.width,
            this.screenBuffer.height);

    this.genDrawInterrupt(this.screenBuffer);
};

/**
 * Sets the cursor back to the start of the page
 */
CLIconsole.prototype.resetXY = function( ) {
    this.CurrentXPosition = 0;
    this.CurrentYPosition = this.CurrentFontSize;
};

/**
 * Write characters from the input queue to the screen
 */
CLIconsole.prototype.handleInput = function( ) {
    while ( this.inputQ.getSize() > 0 ) {
        // Get the next character from the kernel input queue.
        var chr = this.inputQ.dequeue();
        // Check to see if it's "special" (enter or ctrl-c)
        // or "normal" (anything else that the keyboard device driver gave us).
        if ( chr === String.fromCharCode(13) ) // Enter key
        {
            // update recent command list
            if ( this.commandBuffer.index === this.commandBuffer.maxLen ) {
                // wrap around
                this.commandBuffer.index = 0;
            }
            // store in list
            this.commandBuffer.list[this.commandBuffer.index++] = this.buffer;

            if ( DEBUG ) {
                console
                        .log("stored: "
                                + this.commandBuffer.list[this.commandBuffer.index - 1]);
                console.log("shell in: " + this.buffer);
            }

            // The enter key marks the end of a console command, so ...
            // ... tell the shell ...
            this.executeCommand(this.buffer);
            // ... and reset our buffer.
            this.buffer = "";
        }

        else if ( chr === 38 || chr === 40 ) // up/down arrow keys
        {
            if ( this.commandBuffer.list.length > 0 ) {
                // clear current display
                var full_lines = 0;
                var size = this.CurrentXPosition;
                var charsz = 0;
                var lc;

                for ( var i = this.buffer.length - 1; i >= 0; --i ) {
                    // get last character
                    lc = this.buffer[i];
                    // move back along line
                    charsz = this.drawingContext.measureText(lc).width;

                    if ( size - charsz < 0 ) {
                        // line wrap occurred
                        ++full_lines;
                        size = this.screenBuffer.width;

                        // not testing against buffer length, and iterating
                        // backwards
                        // so it is safe to alter buffer size, provided we don't
                        // remove
                        // items that will be iterated through later
                        this.buffer = this.buffer.slice(0, i + 1);

                        if ( DEBUG ) {
                            console.log("buffer post slice: " + this.buffer);
                        }
                    }

                    size -= charsz;
                }

                var clearheight = full_lines
                        * ( this.CurrentFontSize + _FontHeightMargin );

                // deleting full width for # of full lines
                this.drawingContext.clearRect(0, this.CurrentYPosition
                        - clearheight, this.screenBuffer.width,
                        this.CurrentYPosition);

                var wipewidth = this.drawingContext.measureText(this.buffer).width;

                // account for prompt char at beginning
                var start = this.drawingContext.measureText("$").width;

                // wipe remainder
                this.drawingContext.clearRect(start, this.CurrentYPosition
                        - this.CurrentFontSize, start + wipewidth,
                        this.CurrentYPosition + _FontHeightMargin);

                // update screeen
                this.genDrawInterrupt(this.screenBuffer);

                this.CurrentYPosition -= clearheight;
                this.CurrentXPosition = start;

                // replace buffer with old command
                // up arrow
                if ( chr === 38 ) {
                    // index always points to next location to put item in
                    if ( this.commandBuffer.index === 0 ) {
                        // adjust for first item, use length not MaxLen
                        this.commandBuffer.index = this.commandBuffer.list.length;
                    }
                    // get previous command
                    this.buffer = this.commandBuffer.list[--this.commandBuffer.index];
                }
                // down arrow
                else {
                    if ( this.commandBuffer.index === this.commandBuffer.list.length ) {
                        // adjust for last item
                        this.commandBuffer.index = 0;
                    }
                    // get next command
                    this.buffer = this.commandBuffer.list[this.commandBuffer.index++];
                }

                // render new buffer
                this.putText(this.buffer);
            }

        }

        else if ( chr === String.fromCharCode(8) ) // backspace
        {
            if ( this.buffer.length > 0 ) { // stuff to delete
                // get last character
                var lc = this.buffer[this.buffer.length - 1];

                // wipe it from the screen
                this.clearChar(lc);

                // remove last character from buffer
                this.buffer = this.buffer.slice(0, this.buffer.length - 1);
            }
        }

        // TODO: Write a case for Ctrl-C.

        else {
            // This is a "normal" character, so ...
            // ... draw it on the screen...
            this.putText(chr);
            // ... and add it to our buffer.
            this.buffer += chr;
        }

        if ( DEBUG ) {
            console.log("buffer: " + this.buffer);
        }
    }
};

/**
 * Writes a line of text to the canvas
 */
CLIconsole.prototype.putText = function( text ) {
    // My first inclination here was to write two functions: putChar() and
    // putString().
    // Then I remembered that JavaScript is (sadly) untyped and it won't
    // differentiate
    // between the two. So rather than be like PHP and write two (or more)
    // functions that
    // do the same thing, thereby encouraging confusion and decreasing
    // readability, I
    // decided to write one function and use the term "text" to connote string
    // or char.
    if ( DEBUG ) {
        console.log("handling: " + text);
    }

    var lines = [ "" ];
    var l_indx = 0;
    var offsets = [ this.CurrentXPosition ];

    var offset = 0;

    // set up line wrapping if needed
    for ( var i = 0; i < text.length; ++i ) {
        // check where X position of text end will be
        offset = this.drawingContext.measureText(text[i]).width;

        if ( offset + offsets[l_indx] > this.screenBuffer.width ) {
            // drawing to next line
            lines[++l_indx] = "";
            offsets[l_indx] = 0;
        }

        // build line to be drawn
        lines[l_indx] += text[i];
        offsets[l_indx] += offset;
    }

    if ( DEBUG ) {
        console.log("lines: " + lines);
    }

    for ( var i = 0; i < lines.length; ++i ) {
        // Draw the text at the current X and Y coordinates.
        this.drawingContext.fillText(lines[i], this.CurrentXPosition,
                this.CurrentYPosition);

        if ( i < lines.length - 1 ) {
            // more lines to draw, just advance line
            this.advanceLine();
        }
        else {
            // Move the current X position.
            this.CurrentXPosition = offsets[i];
        }
    }

    this.genDrawInterrupt(this.screenBuffer);

    if ( DEBUG ) {
        console.log("x: " + this.CurrentXPosition);
        console.log("y: " + this.CurrentYPosition);
    }
};

/**
 * Moves the cursor position down a line, also handles screen scrolling if
 * necessary
 */
CLIconsole.prototype.advanceLine = function( ) {
    this.CurrentXPosition = 0;
    this.CurrentYPosition += this.CurrentFontSize + _FontHeightMargin;

    // clip top line of canvas and redraw
    if ( this.CurrentYPosition >= this.screenBuffer.height ) {
        // buffer canvas to hold old canvas during canvas clear

        // Pretending this is a page in memory and not a renderable element
        // so it doesn't go through display driver
        var backBuffer = document.createElement('canvas');
        backBuffer.height = this.screenBuffer.height;
        backBuffer.width = this.screenBuffer.width;

        // clip one line from top
        var clip = ( this.CurrentFontSize + _FontHeightMargin );
        var bufferDraw = backBuffer.getContext('2d');

        if ( DEBUG ) {
            console.log("clip size: " + clip);
        }
        // write image to buffer canvas
        // you can also clip images, but this was resulting in type errors
        // this was easier
        bufferDraw.drawImage(this.screenBuffer, 0, -clip);

        // wipe the canvas
        this.drawingContext.clearRect(0, 0, this.screenBuffer.width,
                this.screenBuffer.height);

        // restore canvas with clipped data
        this.drawingContext.drawImage(backBuffer, 0, 0);

        this.genDrawInterrupt(this.screenBuffer);

        // we didn't advance the cursor really, so reset it.
        // Otherwise we'll keep on clearing the screen (which is bad)
        this.CurrentYPosition -= clip;
    }
};

/**
 * Wipes a single character from the canvas
 */
CLIconsole.prototype.clearChar = function( char ) {
    // get last character
    var charwidth = this.drawingContext.measureText(char).width;

    if ( DEBUG ) {
        console.log("erasing size: (" + charwidth + ")");
    }

    // move back current position
    this.CurrentXPosition -= charwidth;

    // see if we need to move back a line
    if ( this.CurrentXPosition < 0 ) {
        // handle if _Canvas.width not a multiple of charwidth
        var charsprln = Math.floor(this.screenBuffer.width / charwidth) - 1;

        // set position to end of previous line
        this.CurrentXPosition = charsprln * charwidth;
        this.CurrentYPosition -= ( this.CurrentFontSize + _FontHeightMargin );
    }

    this.drawingContext.clearRect(this.CurrentXPosition, this.CurrentYPosition
            - this.CurrentFontSize, this.CurrentXPosition + charwidth,
            this.CurrentYPosition + _FontHeightMargin);

    this.genDrawInterrupt(this.screenBuffer);
};
