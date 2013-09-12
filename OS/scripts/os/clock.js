/**
 * Handles getting time/date
 * Maybe this should technically be a device driver?
 */

function Clock () {
    this.months = ['January',   'February', 'March',    'April', 
                   'May',       'June',     'July',     'August',
                   'September', 'October',  'November', 'December'];

    this.dotw   = ['Sunday',   'Monday', 'Tuesday', 'Wednesday', 
                   'Thursday', 'Friday', 'Saturday'];
    //for 1st, 2nd, 3rd, etc.
    this.endings = ['th', 'st', 'nd', 'rd', 'th', 
                    'th', 'th', 'th', 'th', 'th'];

    /*
     * Get the time in 24hr format as hh:mm:ss
     */
    this.getTimeString = function () {
        var date   = new Date();
        var hr = date.getHours();
        var min = date.getMinutes();
        var sec = date.getSeconds();

        if ( hr < 10) {
            hr = "0" + hr;
        }
        if ( min < 10 ) {
            min = "0" + min;
        }
        if (sec < 10) {
            sec = "0" + sec;
        }

        return hr + ":" + min + ":" + sec;
    };

    /*
     * Get the current date in Weekday, Month dd, yyyy format
     */
    this.getDateString = function () {
        var date   = new Date();
        var month  = this.months[date.getMonth()];
        var wkday  = this.dotw[date.getDay()];

        var day    = date.getDate();
        var end    = this.endings[day % 10];

        //11 - 13 use 'th' rather than 11st
        if( Math.floor(day / 10) == 1) {
            end = 'th';
        }

        return wkday + ", " + month + " " + day + end + ", " + date.getFullYear();
    };
}
