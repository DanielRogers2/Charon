/* ------------
   Queue.js
   
   A simple Queue, which is really just a dressed-up JavaScript Array.
   See the Javascript Array documentation at http://www.w3schools.com/jsref/jsref_obj_array.asp .
   Look at the push and shift methods, as they are the least obvious here.
   
   ------------ */

function Queue( ) {
    // Properties
    this.q = new Array();
}

Queue.prototype.getSize = function( ) {
    return this.q.length;
};

Queue.prototype.isEmpty = function( ) {
    return ( this.q.length === 0 );
};

Queue.prototype.enqueue = function( element ) {

    this.q.push(element);
};

Queue.prototype.dequeue = function( ) {
    var retVal = null;
    if ( this.q.length > 0 ) {
        retVal = this.q.shift();
    }
    return retVal;
};

Queue.prototype.peek = function( ) {
    return this.q[0];
};

Queue.prototype.toString = function( ) {
    var retVal = "";
    for ( var i in this.q ) {
        retVal += "[" + this.q[i] + "] ";
    }
    return retVal;
};
