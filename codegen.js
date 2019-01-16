'use strict';

const _ = require('lodash');
const fs = require('fs');
const util = require('util');
const PEG = require('pegjs');

const GRAMMAR_PATH = './mcs8051.pegjs'
const INSN_PATH = './mcs8051.insn';


module.exports = {

  // Build the parser from its PEGJS source file and return the
  // resulting parser object.
  buildParser() {
    let grammar, parser;

    try {
      grammar = fs.readFileSync(require.resolve(GRAMMAR_PATH), 'utf8')
    } catch(e) {
      console.error(`FATAL error reading required '${GRAMMAR_PATH}' grammar:\n`, e);
      process.exit(-1);
    }

    const buildParserOptions = {
      output: 'parser',
      allowedStartRules: ['Start'],
      trace: false,
    };

    try {
      parser = PEG.generate(grammar, buildParserOptions);
    } catch(e) {
      console.error(`INTERNAL ERROR Grammar '${GRAMMAR_PATH}' parse failed:\n`, e);
      process.exit(-1);
    }

    return parser;
  },


  // Initialize the parser for our INSN language.
  init() {
    let insnSrc;
    let ast;

    const parser = module.exports.buildParser();

    try {
      insnSrc = fs.readFileSync(INSN_PATH, {encoding: 'utf-8'});
    } catch(e) {
      console.error(`Unable to open ${INSN_PATH}: ${e.code}`);
      process.exit(-1);
    }

    const tracer = require('./tracer');
    tracer.setSrc(insnSrc);

    try {
      ast = parser.parse(insnSrc, {tracer});
    } catch(e) {
      const found = e.found ? `found "${e.found}"` : '';
      const at = e.location ?
            ` at ${util.inspect(e.location.start)}-${util.inspect(e.location.end)}` :
            '';
      console.error(`\
Parsing or runtime error:
${util.inspect(e, {depth: 99})}
  ${found}${at}`);
      process.exit(-1);
    }

    return _.flatten(ast);
  },


  // Generate instruction handlers and return the array of function
  // pointers to be indexed by opcode.
  generate(ast) {
    const handlers = [];

    ast.forEach(insn => {

      if (insn.type !== 'Instruction') {
        console.error('Bad AST array entry=', util.inspect(insn, {depth:999}));
        return;
      }

      // Define number of byte in Instruction by counting bytes
      // defined nonempty in the entry.
      insn.n = 1 + +!!insn.b2 + +!!insn.b3;

      // Build regular expression from the Bits entry (e.g., 11001001
      // or 1100110I or 11001RRR) by replacing each letter with "." to
      // act as a dont-care bit.
      const toMatch = new RegExp('^' +
                                 insn.b1.bits
                                 .replace(/[A-Z]/g, '.')
                                 + '$');

      _.range(0, 0x100)
        .filter(op => !!toBin8(op).match(toMatch))
        .forEach(op => {
          if (handlers[op]) 
            console.error(`\
In ${insn.mnemonic} handler, \
already defined for ${op.toString(16)}H as ${handlers[op].mnemonic}`);
          handlers[op] = insn;
        });
    });

    // Make sure we define all 256 handlers
    if (0) {
    handlers
      .map((h, op) => !!h ? op : -1)
      .filter(op => op >= 0)
      .forEach(op => console.error(`Handler not defined for ${op.toString(16)}H`));
    }

    return handlers;


    function toBin8(b) {
      return (b | 0x1000).toString(2).slice(-8)
    }
  },
};
