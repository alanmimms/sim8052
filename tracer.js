'use strict'
const _ = require('lodash');
const util = require('util');


var indentLevel = 0;
var options;

var traceStack = [];
var src;


module.exports = {

  // Call this to set src string we are parsing
  setSrc(newSrc) {
    src = newSrc;
  },

  
  trace(event) {
    const log = logByStacking;


    function logByStacking(event, type) {

      const s = event.location.start;
      const e = event.location.end;
      const sLoc = `${s.line}:${s.column}`;
      const eLoc = `${e.line}:${e.column}`;

      let stack = traceStack.map(t => t.rule).join('/') + '/' + event.rule;
      if (stack.length > 100) stack = '... ' + stack.substr(-100);

      console.log(`\
${_.pad(sLoc + '-' + eLoc, 13)} ${_.padStart(type, 5)} \
${stack}  \
${elide(event.location)}`);
    }


    function logByIndenting(event, type) {

      const s = event.location.start;
      const e = event.location.end;
      const sLoc = `${s.line}:${s.column}`;
      const eLoc = `${e.line}:${e.column}`;
      const pad = ". ".repeat(indentLevel);

      console.log(`\
${_.pad(sLoc + '-' + eLoc, 13)} ${_.padStart(type, 5)} \
${pad}${event.rule}  \
${elide(event.location)}`);
    }


    switch (event.type) {
    case "rule.enter":
      log(event, 'start');
      indentLevel++;
      traceStack.push(event);
      break;

    case "rule.match":
      indentLevel--;
      traceStack.pop();
      log(event, 'match');
      break;

    case "rule.fail":
      indentLevel--;
      traceStack.pop();
      log(event, 'fail');
      break;

    default:
      throw new Error("Invalid event type: " + event.type + ".");
    }


    function elide(loc) {
      if (loc.start.offset == loc.end.offset) return '';
      const span = src.substring(loc.start.offset, loc.end.offset);
      return "«" + stringEscape(span) + "»";
    }
  },
};


// Turn a string that possibly contains wonky characters like
// newline and non-printable values into an escaped or hex-escaped
// string for readability.
function stringEscape(s) {
  return s.replace(/["\x01-\x1F\\\x7F-\xFF]/g, escape1);

  function escape1(c) {
    const charCode = c.charCodeAt(0);

    switch (charCode) {
    case 0x07: return '\\a';
    case 0x08: return '\\b';
    case 0x0C: return '\\f';
    case 0x0A: return '\\n';
    case 0x0D: return '\\r';
    case 0x09: return '\\t';
    case 0x0B: return '\\v';
    case 0x22: return '\\"';
    case 0x27: return '\\\'';
    case 0x3F: return '\\?';
    case 0x5C: return '\\\\';

    default:
      return '\\x' + (charCode + 0x1000)
        .toString(16)
        .toUpperCase()
        .substr(-2);

    }
  }
}
