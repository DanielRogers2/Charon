/* --------  
   Utils.js

   Utility functions.
   -------- */
// Use a regular expression to remove leading and trailing spaces.
function trim( str ) {
    return str.replace(/^\s+ | \s+$/g, "");
    /*
     * Huh? Take a breath. Here we go: - The "|" separates this into two
     * expressions, as in A or B. - "^\s+" matches a sequence of one or more
     * whitespace characters at the beginning of a string. - "\s+$" is the same
     * thing, but at the end of the string. - "g" makes is global, so we get all
     * the whitespace. - "" is nothing, which is what we replace the whitespace
     * with.
     */

}

// An easy-to understand implementation of the famous and common Rot13
// obfuscator. You can do this in three lines with a complex regular expression,
// but I'd have trouble explaining it in the future. There's a lot to be said
// for obvious code.
function rot13( str ) {
    var retVal = "";
    for ( var i in str ) {
        var ch = str[i];
        var code = 0;
        if ( "abcedfghijklmABCDEFGHIJKLM".indexOf(ch) >= 0 ) {
            code = str.charCodeAt(i) + 13; // It's okay to use 13. It's not a
            // magic number, it's called rot13.
            retVal = retVal + String.fromCharCode(code);
        }
        else if ( "nopqrstuvwxyzNOPQRSTUVWXYZ".indexOf(ch) >= 0 ) {
            code = str.charCodeAt(i) - 13; // It's okay to use 13. See above.
            retVal = retVal + String.fromCharCode(code);
        }
        else {
            retVal = retVal + ch;
        }
    }
    return retVal;
}

/*
 * Deep copy canvas
 */
function cloneCanvas( canvas ) {
    var copy = document.createElement('canvas');
    var ctxt = copy.getContext('2d');

    copy.height = canvas.height;
    copy.width = canvas.width;

    ctxt.drawImage(canvas, 0, 0);

    return copy;
}

/**
 * Converts an ascii string to a hex byte array
 * 
 * @param string
 *            The string to convert
 * @return an string of 2digit hex values representing the passed in string
 */
function strToHex( string ) {
    // Split the string, then get the charcode of each and convert to hex
    // thanks to
    // http://stackoverflow.com/questions/16893817/javascript-ascii-string-to-hex-byte-array
    var hex = string.split('').map(function( c ) {
        return decToHex(c.charCodeAt(0));
    });

    return hex.join('');
};

/**
 * The inverse of the above, takes a string of 2digit hex bytes and converts to
 * an ascii string
 * 
 * @param hex
 *            An string of 2digit hex bytes
 * @returns An ascii string represented by the data
 */
function hexToStr( hex ) {
    // Split the string
    var data = [ ];
    hex = hex.split('');
    for ( var i = 0; i < hex.length; i += 2 ) {
        data[i / 2] = hex.slice(i, i + 2);
    }

    // then get the decimal value of each and covert to char
    var string = data.map(function( c ) {
        return String.fromCharCode(hexToDec(c));
    });

    return string.join('');
};

/**
 * Convert Hex to Decimal
 * 
 * @param hexval
 *            Expects an array (or string) of hex digits
 */
function hexToDec( hexval ) {

    if ( hexval === undefined )
        return 0;

    if ( hexval.length > 2 ) {
        // strip 0x
        if ( hexval.slice(0, 2) === "0x" ) {
            hexval = hexval.slice(2);
        }
    }

    var decimal = 0;
    var p16 = 0;
    for ( var i = 0; i < hexval.length; ++i ) {
        // Traversing string from left to right
        // (in decreasing order of magnitude)
        // Get the power of 16 value for this hex digit
        p16 = Math.pow(16, ( hexval.length - 1 ) - i);

        // Convert the hex value to its decimal equivalent and then multiply by
        // the appropriate power of 16
        decimal += ( HEXTODEC_TABLE[hexval[i]] * p16 );
    }

    return decimal;
}

/**
 * Convert Decimal to Hex
 * 
 * @param decval
 *            Expects an integer
 */
function decToHex( decval ) {
    var hex = "";

    // Only do work if decval is != 0
    if ( decval != 0 ) {
        // Log16 of value gives the largest power of 16 contained in it
        // No log16 method, so need to transform
        var max_p16 = Math.floor(Math.log(decval) / Math.log(16));

        // Stores the power of 16 to divide out
        var p16 = 0;

        // Stores the unconverted divided out power
        var hexAsDec = 0;

        for ( var i = 0; i <= max_p16; ++i ) {

            p16 = Math.pow(16, ( max_p16 - i ));
            hexAsDec = Math.floor(decval / p16);

            hex += DECTOHEX_TABLE[hexAsDec];

            decval = decval % p16;
        }
    }
    else {
        hex = "00";
    }

    return hex;
}
