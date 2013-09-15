/* ------------
   Shell.js

   The OS Shell - The "command line interface" (CLI) for the console.
   ------------ */

//TODO: Write a base class / prototype for system services and let Shell inherit from it.

function Shell() {
    // Properties
    this.promptStr   = "$";
    this.commandList = [];
    this.curses      = "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]";
    this.apologies   = "[sorry]";
    // Methods
    this.init        = shellInit;
    this.putPrompt   = shellPutPrompt;
    this.handleInput = shellHandleInput;
    this.execute     = shellExecute;
}

function shellInit() {
    var sc = null;
    //
    // Load the command list.

    /*
     * ver
     */ 
    sc = new ShellCommand();
    sc.command = "ver";
    sc.description = "- Displays the current version data.";
    sc.action = function shellVer() {
        _StdIn.putText(APP_NAME + " version " + APP_VERSION);
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * help
     */ 
    sc = new ShellCommand();
    sc.command = "help";
    sc.description = "- This is the help command. Seek help.";
    sc.action = function shellHelp () {
        _StdIn.putText("Commands:");
        for (var i in _OsShell.commandList)
        {
            _StdIn.advanceLine();
            _StdIn.putText("  " + _OsShell.commandList[i].command + " " + _OsShell.commandList[i].description);
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * shutdown
     */ 
    sc = new ShellCommand();
    sc.command = "shutdown";
    sc.description = "- Shuts down the virtual OS but leaves the underlying hardware simulation running.";
    sc.action = function shellShutdown () {
        _StdIn.putText("Shutting down...");
        // Call Kernel shutdown routine.
        krnShutdown();   
        // TODO: Stop the final prompt from being displayed.  If possible.  Not a high priority.  (Damn OCD!)
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * cls
     */ 
    sc = new ShellCommand();
    sc.command = "cls";
    sc.description = "- Clears the screen and resets the cursor position.";
    sc.action = function shellCls () {
        _StdIn.clearScreen();
        _StdIn.resetXY();
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * man <topic>
     */ 
    sc = new ShellCommand();
    sc.command = "man";
    sc.description = "<topic> - Displays the MANual page for <topic>.";
    sc.action = function shellMan (args) {
        if (args.length > 0)
        {
            var topic = args[0];
            switch (topic)
            {
            case "help": 
                _StdIn.putText("Help displays a list of (hopefully) valid commands.");
                break;
            default:
                _StdIn.putText("No manual entry for " + args[0] + ".");
            }
        }
        else
        {
            _StdIn.putText("Usage: man <topic>  Please supply a topic.");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * trace <on | off>
     */ 
    sc = new ShellCommand();
    sc.command = "trace";
    sc.description = "<on | off> - Turns the OS trace on or off.";
    sc.action = function shellTrace (args){
        if (args.length > 0)
        {
            var setting = args[0];
            switch (setting)
            {
            case "on": 
                if (_Trace && _SarcasticMode)
                {
                    _StdIn.putText("Trace is already on, dumbass.");
                }
                else
                {
                    _Trace = true;
                    _StdIn.putText("Trace ON");
                }

                break;
            case "off": 
                _Trace = false;
                _StdIn.putText("Trace OFF");                
                break;                
            default:
                _StdIn.putText("Invalid arguement.  Usage: trace <on | off>.");
            }        
        }
        else
        {
            _StdIn.putText("Usage: trace <on | off>");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * rot13 <string>
     */ 
    sc = new ShellCommand();
    sc.command = "rot13";
    sc.description = "<string> - Does rot13 obfuscation on <string>.";
    sc.action = function shellRot13 (args) {
        if (args.length > 0)
        {
            _StdIn.putText(args[0] + " = '" + rot13(args[0]) +"'");     // Requires Utils.js for rot13() function.
        }
        else
        {
            _StdIn.putText("Usage: rot13 <string>  Please supply a string.");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * prompt <string>
     */ 
    sc = new ShellCommand();
    sc.command = "prompt";
    sc.description = "<string> - Sets the prompt.";
    sc.action = function shellPrompt (args) {
        if (args.length > 0)
        {
            _OsShell.promptStr = args[0];
        }
        else
        {
            _StdIn.putText("Usage: prompt <string>  Please supply a string.");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * date
     */
    sc = new ShellCommand();
    sc.command = "date";
    sc.description = " - Displays the current date";
    sc.action = function shellDate() {
        var date = new Date();
        var clock = new Clock();

        //Dayofweek, Month dd, yyyy at hh:mm:ss
        _StdOut.putText(clock.getDateString(date) + " at " + clock.getTimeString(date));

        //you could also do
        //_StdOut.putText(date.toString())
        //but mine is cooler

        //_KernelTimedEventQueue.enqueue(onTick);
        //_KernelInterruptQueue.enqueue(new Interrupt(TIMER_IRQ, []));
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * whereami
     */ 
    sc = new ShellCommand();
    sc.command = "whereami";
    sc.description = " - Shows the current location of the system";
    sc.action = function shellLocation () {
        //yuca mountain
        _StdOut.putText("36 degrees 56' 25\" N, 116 degrees 29' 06\" W");
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Set status message
     */
    sc = new ShellCommand();
    sc.command = "status";
    sc.description = " - Set the status bar status message.";
    sc.action = function (args) {
        if (args.length > 0) {
            _StatusBar.updateStatus(args[0]);
        }
        else {
            _StdIn.putText("Usage: status <string>  Please supply a string.");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * fun stuff
     */
    sc = new ShellCommand();
    sc.command = "countdown";
    sc.description = " - ????";
    sc.action = function secret () {
        //it's cooler if it scrolls slowly
        clearInterval(_hardwareClockID);
        _hardwareClockID = setInterval(hostClockPulse, 500);

        _StdOut.putText("Ground Control to Major Tom");
        _StdOut.advanceLine();
        _StdOut.putText("Ground Control to Major Tom");
        _StdOut.advanceLine();
        _StdOut.putText("Take your protein pills and put your helmet on");
        _StdOut.advanceLine();
        _StdOut.advanceLine();
        _StdOut.putText("Ground Control to Major Tom");
        _StdOut.advanceLine();
        _StdOut.putText("Commencing countdown, engines on");
        _StdOut.advanceLine();
        _StdOut.putText("Check ignition and may God's love be with you");
        _StdOut.advanceLine();
        _StdOut.advanceLine();
        _StdOut.putText("Ten, Nine, Eight, Seven, Six, Five, Four, Three, Two, One, Liftoff");
        _StdOut.advanceLine();
        _StdOut.advanceLine();
        _StdOut.putText("This is Ground Control to Major Tom");
        _StdOut.advanceLine();
        _StdOut.putText("You've really made the grade");
        _StdOut.advanceLine();
        _StdOut.putText("And the papers want to know whose shirts you wear");
        _StdOut.advanceLine();
        _StdOut.putText("Now it's time to leave the capsule if you dare");
        _StdOut.advanceLine();
        _StdOut.advanceLine();
        _StdOut.putText('"This is Major Tom to Ground Control');
        _StdOut.advanceLine();
        _StdOut.putText("I'm stepping through the door");
        _StdOut.advanceLine();
        _StdOut.putText("And I'm floating in a most peculiar way");
        _StdOut.advanceLine();
        _StdOut.putText("And the stars look very different today");
        _StdOut.advanceLine();
        _StdOut.advanceLine();
        _StdOut.putText("For here");
        _StdOut.advanceLine();
        _StdOut.putText("Am I sitting in a tin can");
        _StdOut.advanceLine();
        _StdOut.putText("Far above the world");
        _StdOut.advanceLine();
        _StdOut.putText("Planet Earth is blue");
        _StdOut.advanceLine();
        _StdOut.putText("And there's nothing I can do");
        _StdOut.advanceLine();
        _StdOut.advanceLine();
        _StdOut.putText("Though I'm past one hundred thousand miles");
        _StdOut.advanceLine();
        _StdOut.putText("I'm feeling very still");
        _StdOut.advanceLine();
        _StdOut.putText("And I think my spaceship knows which way to go");
        _StdOut.advanceLine();
        _StdOut.putText('Tell my wife I love her very much she knows"');
        _StdOut.advanceLine();
        _StdOut.advanceLine();
        _StdOut.putText("Ground Control to Major Tom");
        _StdOut.advanceLine();
        _StdOut.putText("Your circuit's dead, there's something wrong");
        _StdOut.advanceLine();
        _StdOut.putText("Can you hear me, Major Tom?");
        _StdOut.advanceLine();
        _StdOut.putText("Can you hear me, Major Tom?");
        _StdOut.advanceLine();
        _StdOut.putText("Can you hear me, Major Tom?");
        _StdOut.advanceLine();
        _StdOut.putText("Can you....");
        _StdOut.advanceLine();
        _StdOut.advanceLine();
        _StdOut.putText('"Here am I floating round my tin can');
        _StdOut.advanceLine();
        _StdOut.putText("Far above the Moon");
        _StdOut.advanceLine();
        _StdOut.putText("Planet Earth is blue");
        _StdOut.advanceLine();
        _StdOut.putText('And there\'s nothing I can do."');

        //reset the timer so they don't deal with sluggish response times
        _KernelTimedEventQueue.enqueue([null, function () {
            clearInterval(_hardwareClockID); 
            _hardwareClockID = setInterval(hostClockPulse, CPU_CLOCK_INTERVAL); 
        }]);
        _KernelInterruptQueue.enqueue(new Interrupt(TIMER_IRQ, []));

    };
    this.commandList[this.commandList.length] = sc;

    // processes - list the running processes and their IDs
    // kill <id> - kills the specified process id.

    //
    // Display the initial prompt.
    this.putPrompt();
}

function shellPutPrompt()
{
    _StdIn.putText(this.promptStr);
}

function shellHandleInput(buffer)
{
    krnTrace("Shell Command~" + buffer);
    // 
    // Parse the input...
    //
    var userCommand = new UserCommand();
    userCommand = shellParseInput(buffer);
    // ... and assign the command and args to local variables.
    var cmd = userCommand.command;
    var args = userCommand.args;
    //
    // Determine the command and execute it.
    //
    // JavaScript may not support associative arrays in all browsers so we have to
    // iterate over the command list in attempt to find a match.  TODO: Is there a better way? Probably.
    var index = 0;
    var found = false;
    while (!found && index < this.commandList.length)
    {
        if (this.commandList[index].command === cmd)
        {
            found = true;
            var fn = this.commandList[index].action;
        }
        else
        {
            ++index;
        }
    }
    if (found)
    {
        this.execute(fn, args);
    }
    else
    {
        // It's not found, so check for curses and apologies before declaring the command invalid.
        if (this.curses.indexOf("[" + rot13(cmd) + "]") >= 0)      // Check for curses.
        {
            this.execute(shellCurse);
        }
        else if (this.apologies.indexOf("[" + cmd + "]") >= 0)      // Check for apologies.
        {
            this.execute(shellApology);
        }
        else    // It's just a bad command.
        {
            this.execute(shellInvalidCommand);
        }
    }
}

function shellParseInput(buffer)
{
    var retVal = new UserCommand();

    // 1. Remove leading and trailing spaces.
    buffer = buffer.trim();

    // 2. Lower-case it.
    buffer = buffer.toLowerCase();

    // 3. Separate on spaces so we can determine the command and command-line args, if any.
    var tempList = buffer.split(" ");

    // 4. Take the first (zeroth) element and use that as the command.
    var cmd = tempList.shift();  // Yes, you can do that to an array in JavaScript.  See the Queue class.
    // 4.1 Remove any left-over spaces.
    cmd = trim(cmd);
    // 4.2 Record it in the return value.
    retVal.command = cmd;

    // 5. Now create the args array from what's left.
    for (var i in tempList)
    {
        var arg = trim(tempList[i]);
        if (arg != "")
        {
            retVal.args[retVal.args.length] = tempList[i];
        }
    }
    return retVal;
}

function shellExecute(fn, args)
{
    // We just got a command, so advance the line...
    _StdIn.advanceLine();
    // ... call the command function passing in the args...
    fn(args);
    // Check to see if we need to advance the line again
    if (_StdIn.CurrentXPosition > 0)
    {
        _StdIn.advanceLine();
    }
    // ... and finally write the prompt again.
    this.putPrompt();
}

//An "interior" or "private" class (prototype) used only inside Shell() (we hope).

function ShellCommand()     
{
    // Properties
    this.command = "";
    this.description = "";
    this.action = "";
}


//Another "interior" or "private" class (prototype) used only inside Shell() (we hope).

function UserCommand()
{
    // Properties
    this.command = "";
    this.args = [];
}



//Shell Command Functions.  Again, not part of Shell() class per se', just called from there.

function shellInvalidCommand()
{
    _StdIn.putText("Invalid Command. ");
    if (_SarcasticMode)
    {
        _StdIn.putText("Duh. Go back to your Speak & Spell.");
    }
    else
    {
        _StdIn.putText("Type 'help' for, well... help.");
    }
}

function shellCurse()
{
    _StdIn.putText("Oh, so that's how it's going to be, eh? Fine.");
    _StdIn.advanceLine();
    _StdIn.putText("Bitch.");
    _SarcasticMode = true;
}

function shellApology()
{
    if (_SarcasticMode) {
        _StdIn.putText("Okay. I forgive you. This time.");
        _SarcasticMode = false;
    } else {
        _StdIn.putText("For what?");
    }
}
