/* ------------
   Shell.js

   The OS Shell - The "command line interface" (CLI) for the console.
   ------------ */

//TODO: Write a base class / prototype for system services and let Shell inherit from it.
function Shell( kernel ) {
    // Properties
    this.promptStr = "$";
    this.commandList = [ ];
    this.curses = "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]";
    this.apologies = "[sorry]";
    this.kernel = kernel;
    this.stdOut = this.kernel.stdOut;
    this.stdIn = this.kernel.stdIn;

    //
    // Load the command list.
    var sc = undefined;
    var shell = this;

    /*
     * ver
     */
    sc = new ShellCommand();
    sc.command = "ver";
    sc.description = "- Displays the current version data.";
    sc.action = function( ) {
        shell.stdOut.putText(APP_NAME + " version " + APP_VERSION);
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * help
     */
    sc = new ShellCommand();
    sc.command = "help";
    sc.description = "- This is the help command. Seek help.";
    sc.action = function( ) {
        shell.stdOut.putText("Commands:");
        for ( var i in shell.commandList ) {
            shell.stdOut.advanceLine();
            shell.stdOut.putText("  " + shell.commandList[i].command + " "
                    + shell.commandList[i].description);
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * shutdown
     */
    sc = new ShellCommand();
    sc.command = "shutdown";
    sc.description = "- Shuts down the virtual OS but leaves the underlying hardware simulation running.";
    sc.action = function( ) {
        shell.stdOut.putText("Shutting down...");
        // Call Kernel shutdown routine.
        shell.kernel.Shutdown();
        // TODO: Stop the final prompt from being displayed. If possible. Not a
        // high priority. (Damn OCD!)
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * cls
     */
    sc = new ShellCommand();
    sc.command = "cls";
    sc.description = "- Clears the screen and resets the cursor position.";
    sc.action = function( ) {
        shell.stdOut.clearScreen();
        shell.stdOut.resetXY();
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * man <topic>
     */
    sc = new ShellCommand();
    sc.command = "man";
    sc.description = "<topic> - Displays the MANual page for <topic>.";
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            var topic = args[0];
            switch ( topic ) {
            case "help":
                shell.stdOut
                        .putText("Help displays a list of (hopefully) valid commands.");
                break;
            default:
                shell.stdOut.putText("No manual entry for " + args[0] + ".");
            }
        }
        else {
            shell.stdOut.putText("Usage: man <topic>  Please supply a topic.");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * trace <on | off>
     */
    sc = new ShellCommand();
    sc.command = "trace";
    sc.description = "<on | off> - Turns the OS trace on or off.";
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            var setting = args[0];
            switch ( setting ) {
            case "on":
                if ( _Trace && _SarcasticMode ) {
                    shell.stdOut.putText("Trace is already on, dumbass.");
                }
                else {
                    _Trace = true;
                    shell.stdOut.putText("Trace ON");
                }

                break;
            case "off":
                _Trace = false;
                shell.stdOut.putText("Trace OFF");
                break;
            default:
                shell.stdOut
                        .putText("Invalid arguement.  Usage: trace <on | off>.");
            }
        }
        else {
            shell.stdOut.putText("Usage: trace <on | off>");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * rot13 <string>
     */
    sc = new ShellCommand();
    sc.command = "rot13";
    sc.description = "<string> - Does rot13 obfuscation on <string>.";
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            shell.stdOut.putText(args[0] + " = '" + rot13(args[0]) + "'"); // Requires
            // Utils.js
            // for
            // rot13()
            // function.
        }
        else {
            shell.stdOut
                    .putText("Usage: rot13 <string>  Please supply a string.");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * prompt <string>
     */
    sc = new ShellCommand();
    sc.command = "prompt";
    sc.description = "<string> - Sets the prompt.";
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            shell.promptStr = args[0];
        }
        else {
            shell.stdOut
                    .putText("Usage: prompt <string>  Please supply a string.");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * date
     */
    sc = new ShellCommand();
    sc.command = "date";
    sc.description = " - Displays the current date";
    sc.action = function( ) {
        var date = new Date();
        var clock = new Clock();

        // Dayofweek, Month dd, yyyy at hh:mm:ss
        shell.stdOut.putText(clock.getDateString(date) + " at "
                + clock.getTimeString(date));

        // you could also do
        // shell.stdOut.putText(date.toString())
        // but mine is cooler
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * whereami
     */
    sc = new ShellCommand();
    sc.command = "whereami";
    sc.description = " - Shows the current location of the system";
    sc.action = function( ) {
        // yuca mountain
        shell.stdOut.putText("36 degrees 56' 25\" N, 116 degrees 29' 06\" W");
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Set status message
     */
    sc = new ShellCommand();
    sc.command = "status";
    sc.description = " - Set the status bar status message.";
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            shell.kernel.statusBar.updateStatus(args.join(" "));
        }
        else {
            shell.stdOut
                    .putText("Usage: status <string>  Please supply a string.");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Load a program
     */
    sc = new ShellCommand();
    sc.command = 'load';
    sc.description = ' <priority> - loads a program from the program entry';
    sc.action = function( args ) {
        // Validate hex and load
        var rawProg = document.getElementById("taProgramInput").value;

        // remove whitespace
        rawProg = rawProg.replace(/\s+/g, '').toUpperCase();

        // if not A-F,0-9then it's not valid hex
        var invExp = new RegExp("[^A-F0-9\n]", "m");
        var valExp = new RegExp("[A-F0-9]", "m");

        var invalid = invExp.test(rawProg);
        // check if multiple of 2 values (full bytes)
        invalid = invalid || ( ( rawProg.length % 2 ) != 0 );
        // Maximum size of 256 for now
        invalid = invalid
                || ( rawProg.length > ( 2 * shell.kernel.MMU.PROGRAM_ALLOWED_MEM ) );

        var valid = valExp.test(rawProg);

        if ( !invalid && valid ) {
            // split into dual-hex blocks
            var progBytes = [ ];
            for ( var i = 0; i < rawProg.length; i += 2 ) {
                progBytes[i / 2] = rawProg.slice(i, i + 2);
            }

            // See if a priority was passed in
            var prior = ( args && args.length > 0 ) ? parseInt(args[0])
                    : undefined;

            // Create process control block
            var pcb = shell.kernel.allocateProgram(-1, prior);

            if ( !pcb ) {
                // Kernel couldn't create the PCB
                shell.stdOut.putText("Unable to allocate PCB");
                return;
            }

            shell.stdOut.putText("Loaded Program");
            shell.stdOut.advanceLine();

            // Initialize the PCB with the program code
            pcb.init(progBytes);

            if ( DEBUG ) {
                console.log(pcb);
            }

            shell.stdOut.putText("PID: " + pcb.PID);
        }
        else {
            shell.stdOut.putText("Invalid Program!");
        }

    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Run a loaded program
     */
    sc = new ShellCommand();
    sc.command = 'run';
    sc.description = ' <pid> [pids...] - run loaded programs with <pid> or [pids]';
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            // Does the actual work to load a process or print debug info
            var ld = function( pid ) {
                if ( pid in shell.kernel.loadedProcesses ) {
                    // Valid process to execute
                    shell.kernel.queueProgram(pid);

                    shell.kernel.startExecution();
                }
                else {
                    shell.stdOut.putText("No such program");
                }
            };

            // \javascript\...
            if ( args.length > 1 ) {
                for ( var pid in args ) {
                    ld(pid);
                }
            }
            else {
                // \JAVASCRIPT\
                var pid = parseInt(args[0]);
                ld(pid);
            }
        }
        else {
            shell.stdOut.putText("Please supply a PID");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Run all loaded programs
     */
    sc = new ShellCommand();
    sc.command = 'runall';
    sc.description = ' - executes all loaded programs';
    sc.action = function( args ) {
        var pids = Object.keys(shell.kernel.loadedProcesses);
        pids = pids.map(function( id ) {
            return parseInt(id);
        });

        var sortbyfuckingintegernotascii = function( a, b ) {
            return ( a == b ) ? 0 : ( a < b ) ? -1 : 1;
        };
        pids = pids.sort(sortbyfuckingintegernotascii);

        if ( pids.length == 0 ) {
            shell.stdOut.putText("No loaded processes");
        }
        else {

            console.log(pids);
            for ( var i = 0; i < pids.length; ++i ) {
                shell.kernel.queueProgram(pids[i]);
            }

            shell.kernel.startExecution();
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Updates the round robin quantum
     */
    sc = new ShellCommand();
    sc.command = 'quantum';
    sc.description = ' - sets the number of CPU cycles for RR scheduling (default == 6)';
    sc.action = function( args ) {
        if ( !args ) {
            shell.stdOut.putText("Please supply a quantum");
        }
        else if ( args[0] === 'default' ) {
            shell.kernel.shortTermSched.quantum = shell.kernel.shortTermSched.DEFAULT_QUANTUM;
            shell.stdOut.putText("Reset quantum to default");
        }
        else if ( args[0] > 0 ) {
            shell.kernel.shortTermSched.quantum = parseInt(args[0]);
            shell.stdOut.putText("Set quantum to: " + args[0]);
        }
        else {
            shell.stdOut.putText("Invalid quantum");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Sets the scheduling type
     */
    sc = new ShellCommand();
    sc.command = 'setschedule';
    sc.description = ' - sets the scheduling type, choices: [rr, fcfs, priority], default == rr';
    sc.action = function( args ) {
        if ( !args ) {
            shell.stdOut.putText("Please supply a mode");
        }
        else if ( args[0] === 'default' ) {
            shell.kernel.shortTermSched.mode = shell.kernel.shortTermSched.DEFAULT_MODE;
            shell.stdOut.putText("Reset mode to default");
        }
        else if ( shell.kernel.shortTermSched.SCHEDULING_CHOICES
                .indexOf(args[0]) != -1 ) {
            shell.kernel.shortTermSched.mode = args[0];
            shell.stdOut.putText("Set mode to: " + args[0]);
        }
        else {
            shell.stdOut.putText("Invalid mode");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Gets the scheduling type
     */
    sc = new ShellCommand();
    sc.command = 'getschedule';
    sc.description = ' - gets the scheduling type';
    sc.action = function( ) {
        shell.stdOut.putText(shell.kernel.shortTermSched.mode);
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Step through a loaded program
     */
    sc = new ShellCommand();
    sc.command = 'step';
    sc.description = ' <pid> - single step a loaded program with <pid>';
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            if ( args[0] in shell.kernel.loadedProcesses ) {
                // Have an actual process we can execute
                // TODO: Put on ready queue and then execute for scheduling
                shell.kernel.activeProcess = shell.kernel.loadedProcesses[args[0]];

                // Clear junk data if needed
                shell.kernel.activeProcess.zeroRegisters();

                shell.kernel.activeProcess.load();
                // Let them hit the step button to step through
                document.getElementById('btnStep').disabled = false;

                shell.kernel.activeProcess.state = "running";

                shell.stdOut.putText("Program Ready, hit Step button to step");
            }
            else {
                shell.stdOut.putText("No such process");
            }
        }
        else {
            shell.stdOut.putText("Please supply a PID");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Display active process IDs
     */
    sc = new ShellCommand();
    sc.command = 'ps';
    sc.description = ' - display active process ids, specify -l for loaded';
    sc.action = function( args ) {
        if ( args[0] === "-l" ) {
            var printed = false;
            shell.stdOut.putText("Loaded processes: ");
            for ( var pid in shell.kernel.loadedProcesses ) {
                shell.stdOut.putText(pid + " ");
                printed = true;
            }

            // We didn't display a process
            if ( !printed ) {
                shell.stdOut.putText("None");
            }

        }
        else if ( shell.kernel.activeProcess ) {
            shell.stdOut.putText("Active PIDs: ");
            shell.stdOut.putText(shell.kernel.activeProcess.PID + " ");

            for ( var i = 0; i < shell.kernel.readyQueue.getSize(); ++i ) {
                shell.stdOut.putText(shell.kernel.readyQueue.q[i] + " ");
            }
        }
        else {
            shell.stdOut.putText("No active processes");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Kill an active process
     */
    sc = new ShellCommand();
    sc.command = 'kill';
    sc.description = ' <pid> - kills an active process with pid <pid>';
    sc.action = function( args ) {
        if ( args.length > 0 && args[0] in shell.kernel.loadedProcesses ) {
            // See if it's running or queued
            var pid = parseInt(args[0]);
            if ( ( shell.kernel.activeProcess && shell.kernel.activeProcess.PID == pid )
                    || shell.kernel.readyQueue.q.indexOf(pid) > -1 ) {
                shell.kernel.freeProcess(pid);
                shell.stdOut.putText("Killed PID: " + pid);
            }
            else {
                shell.stdOut
                        .putText("Use unload to remove loaded, but non-active, processes");
            }
        }
        else {
            shell.stdOut.putText("Please supply a valid PID");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Remove a loaded process
     */
    sc = new ShellCommand();
    sc.command = 'unload';
    sc.description = ' <pid> - removes an inactive process';
    sc.action = function( args ) {
        if ( args.length > 0 && args[0] in shell.kernel.loadedProcesses ) {
            // See if it's running or queued
            if ( !( shell.kernel.activeProcess && shell.kernel.activeProcess.PID == args[0] )
                    && shell.kernel.readyQueue.q.indexOf(args[0]) == -1 ) {
                shell.kernel.freeProcess(args[0]);
                shell.stdOut.putText("Unloaded PID: " + args[0]);
            }
            else {
                shell.stdOut.putText("Use kill to remove active processes");
            }
        }
        else {
            shell.stdOut.putText("Please supply a valid PID");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Create File
     */
    sc = new ShellCommand();
    sc.command = 'create';
    sc.description = ' <filename> - make a new file';
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            var fname = args[0];
            // try to read
            var res = shell.kernel.fsDriver.createFile(fname);
            // Tell them what happened
            shell.stdOut.putText(res);

        }
        else {
            shell.stdOut.putText("Please supply a filename");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Read File
     */
    sc = new ShellCommand();
    sc.command = 'read';
    sc.description = ' <filename> - read the contents of a file';
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            var fname = args[0];
            // try to read
            var res = shell.kernel.fsDriver.readFile(fname);

            if ( res.success ) {
                // Show data
                shell.stdOut.putText(hexToStr(res.data));
            }
            else {
                // Show error
                shell.stdOut.putText("Failure: " + res.data);
            }
        }
        else {
            shell.stdOut.putText("Please supply a filename");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Write to File
     */
    sc = new ShellCommand();
    sc.command = 'write';
    sc.description = ' <filename> data - write data to file';
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            // Get the file name
            var fname = args[0];
            var data;

            // Get the data
            if ( args.length > 1 ) {
                data = args.slice(1).join(' ');
            }
            else {
                data = '';
            }

            // try to write
            var res = shell.kernel.fsDriver.writeFile(fname, data);

            // Show result message
            shell.stdOut.putText(res);
        }
        else {
            shell.stdOut.putText("Please supply a filename");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Delete File
     */
    sc = new ShellCommand();
    sc.command = 'delete';
    sc.description = ' <filename> - delete a file from the disk';
    sc.action = function( args ) {
        if ( args.length > 0 ) {
            var fname = args[0];
            // try to read
            var res = shell.kernel.fsDriver.deleteFile(fname);
            // Tell them what happened
            shell.stdOut.putText(res);

        }
        else {
            shell.stdOut.putText("Please supply a filename");
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Format Disk
     */
    sc = new ShellCommand();
    sc.command = 'format';
    sc.description = ' formats the disk';
    sc.action = function( args ) {
        shell.kernel.fsDriver.format();
        // Clear loaded programs
        shell.kernel.loadedProcesses = { };
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * List the available files
     */
    sc = new ShellCommand();
    sc.command = 'ls';
    sc.description = ' lists current files';
    sc.action = function( args ) {
        // Get the list of files
        var files = shell.kernel.fsDriver.file_list;
        for ( file in files ) {
            // Put them out one by one
            shell.stdOut.putText("File listing:");
            shell.stdOut.advanceLine();
            shell.stdOut.putText(file);
            shell.stdOut.advanceLine();
        }
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * crash
     */
    sc = new ShellCommand();
    sc.command = 'crash';
    sc.description = ' - crashes';
    sc.action = function( ) {
        shell.kernel.trapError("forced crash");
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * Load default program
     */
    sc = new ShellCommand();
    sc.command = 'prg1';
    sc.description = ' - stuff';
    sc.action = function( ) {
        var prog = "A9 00 8D 7B 00 A9 00 8D 7B 00 A9 00 8D 7C 00 A9 00 8D 7C"
                + "00 A9 01 8D 7A 00 A2 00 EC 7A 00 D0 39 A0 7D A2 02 FF AC "
                + "7B 00 A2 01 FF AD 7B 00 8D 7A 00 A9 01 6D 7A 00 8D 7B 00 "
                + "A9 09 AE 7B 00 8D 7A 00 A9 00 EC 7A 00 D0 02 A9 01 8D 7A "
                + "00 A2 01 EC 7A 00 D0 05 A9 01 8D 7C 00 A9 00 AE 7C 00 8D "
                + "7A 00 A9 00 EC 7A 00 D0 02 A9 01 8D 7A 00 A2 00 EC 7A 00 "
                + "D0 AC A0 7F A2 02 FF 00 00 00 00 63 00 63 64 6F 6E 65 00";
        document.getElementById("taProgramInput").value = prog;
    };
    this.commandList[this.commandList.length] = sc;

    /*
     * fun stuff
     */
    sc = new ShellCommand();
    sc.command = "countdown";
    sc.description = " - ????";
    sc.action = function( ) {
        // it's cooler if it scrolls slowly
        clearInterval(shell.kernel.host.hardwareClockID);
        shell.kernel.host.hardwareClockID = setInterval(function( ) {
            shell.kernel.host.clockPulse();
        }, 300);

        shell.stdOut.putText("Ground Control to Major Tom");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Ground Control to Major Tom");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Take your protein pills and put your helmet on");
        shell.stdOut.advanceLine();
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Ground Control to Major Tom");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Commencing countdown, engines on");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Check ignition and may God's love be with you");
        shell.stdOut.advanceLine();
        shell.stdOut.advanceLine();
        shell.stdOut
                .putText("Ten, Nine, Eight, Seven, Six, Five, Four, Three, Two, One, Liftoff");
        shell.stdOut.advanceLine();
        shell.stdOut.advanceLine();
        shell.stdOut.putText("This is Ground Control to Major Tom");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("You've really made the grade");
        shell.stdOut.advanceLine();
        shell.stdOut
                .putText("And the papers want to know whose shirts you wear");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Now it's time to leave the capsule if you dare");
        shell.stdOut.advanceLine();
        shell.stdOut.advanceLine();
        shell.stdOut.putText('"This is Major Tom to Ground Control');
        shell.stdOut.advanceLine();
        shell.stdOut.putText("I'm stepping through the door");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("And I'm floating in a most peculiar way");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("And the stars look very different today");
        shell.stdOut.advanceLine();
        shell.stdOut.advanceLine();
        shell.stdOut.putText("For here");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Am I sitting in a tin can");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Far above the world");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Planet Earth is blue");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("And there's nothing I can do");
        shell.stdOut.advanceLine();
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Though I'm past one hundred thousand miles");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("I'm feeling very still");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("And I think my spaceship knows which way to go");
        shell.stdOut.advanceLine();
        shell.stdOut.putText('Tell my wife I love her very much she knows"');
        shell.stdOut.advanceLine();
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Ground Control to Major Tom");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Your circuit's dead, there's something wrong");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Can you hear me, Major Tom?");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Can you hear me, Major Tom?");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Can you hear me, Major Tom?");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Can you....");
        shell.stdOut.advanceLine();
        shell.stdOut.advanceLine();
        shell.stdOut.putText('"Here am I floating round my tin can');
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Far above the Moon");
        shell.stdOut.advanceLine();
        shell.stdOut.putText("Planet Earth is blue");
        shell.stdOut.advanceLine();
        shell.stdOut.putText('And there\'s nothing I can do."');

        // reset the timer so they don't deal with sluggish response times
        var crash = function( ) {
            shell.kernel.trapError("BSOD");
        };

        shell.kernel.queueInterrupt(shell.kernel.TIMER_IRQ, [ null, crash ]);
    };
    this.commandList[this.commandList.length] = sc;

    // processes - list the running processes and their IDs
    // kill <id> - kills the specified process id.

    //
    // Display the initial prompt.
    this.prompt();
}

Shell.prototype.prompt = function( ) {
    this.stdIn.putText(this.promptStr);
};

/**
 * Handles execution of user commands
 * 
 * @param buffer
 */
Shell.prototype.handleInput = function( buffer ) {
    this.kernel.trace("Shell Command~" + buffer);
    // 
    // Parse the input...
    //
    var userCommand = new UserCommand();
    userCommand = this.parseInput(buffer);
    // ... and assign the command and args to local variables.
    var cmd = userCommand.command;
    var args = userCommand.args;
    var fn = undefined;

    //
    // Determine the command and execute it.
    //
    // JavaScript may not support associative arrays in all browsers so we have
    // to iterate over the command list in attempt to find a match. TODO: Is
    // there a better way? Probably.
    var index = 0;
    var found = false;
    while ( !found && index < this.commandList.length ) {
        if ( this.commandList[index].command === cmd ) {
            found = true;
            fn = this.commandList[index].action;
        }
        else {
            ++index;
        }
    }
    if ( found ) {
        this.execute(fn, args);
    }
    else {
        // It's not found, so check for curses and apologies before declaring
        // the command invalid.
        if ( this.curses.indexOf("[" + rot13(cmd) + "]") >= 0 ) {
            // Check for curses.
            var shell = this;
            this.execute(function( ) {
                shell.curse();
            });
        }
        else if ( this.apologies.indexOf("[" + cmd + "]") >= 0 ) {
            // Check for apologies.
            var shell = this;
            this.execute(function( ) {
                shell.apology();
            });
        }
        else {
            // It's just a bad command.
            var shell = this;
            this.execute(function( ) {
                shell.invalidCommand();
            });
        }
    }
};

/**
 * Parses user requests
 * 
 * @param buffer
 */
Shell.prototype.parseInput = function( buffer ) {
    var retVal = new UserCommand();

    // 1. Remove leading and trailing spaces.
    buffer = buffer.trim();

    // 2. Lower-case it.
    buffer = buffer.toLowerCase();

    // 3. Separate on spaces so we can determine the command and command-line
    // args, if any.
    var tempList = buffer.split(" ");

    // 4. Take the first (zeroth) element and use that as the command.
    var cmd = tempList.shift(); // Yes, you can do that to an array in
    // JavaScript. See the Queue class.
    // 4.1 Remove any left-over spaces.
    cmd = trim(cmd);
    // 4.2 Record it in the return value.
    retVal.command = cmd;

    // 5. Now create the args array from what's left.
    for ( var i in tempList ) {
        var arg = trim(tempList[i]);
        if ( arg != "" ) {
            retVal.args[retVal.args.length] = tempList[i];
        }
    }
    return retVal;
};

/**
 * Executes a user command
 * 
 * @param fn
 * @param args
 */
Shell.prototype.execute = function( fn, args ) {
    // We just got a command, so advance the line...
    this.stdOut.advanceLine();
    // ... call the command function passing in the args...
    fn(args);
    // Check to see if we need to advance the line again
    if ( this.stdOut.CurrentXPosition > 0 ) {
        this.stdOut.advanceLine();
    }
    // ... and finally write the prompt again.
    this.prompt();
};

// Shell Command Functions. Again, not part of Shell() class per se', just
// called from there.
Shell.prototype.invalidCommand = function( ) {

    this.stdOut.putText("Invalid Command. ");
    if ( _SarcasticMode ) {
        this.stdOut.putText("Duh. Go back to your Speak & Spell.");
    }
    else {
        this.stdOut.putText("Type 'help' for, well... help.");
    }
};

Shell.prototype.curse = function( ) {
    this.stdOut.putText("Oh, so that's how it's going to be, eh? Fine.");
    this.stdOut.advanceLine();
    this.stdOut.putText("Bitch.");
    _SarcasticMode = true;
};

Shell.prototype.apology = function( ) {
    if ( _SarcasticMode ) {
        this.stdOut.putText("Okay. I forgive you. This time.");
        _SarcasticMode = false;
    }
    else {
        this.stdOut.putText("For what?");
    }
};

// An "interior" or "private" class (prototype) used only inside Shell() (we
// hope).
function ShellCommand( ) {
    // Properties
    this.command = "";
    this.description = "";
    this.action = "";
}

// Another "interior" or "private" class (prototype) used only inside Shell()
// (we hope).
function UserCommand( ) {
    // Properties
    this.command = "";
    this.args = [ ];
}
