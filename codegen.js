'use strict';

const _ = require('lodash');
const fs = require('fs');
const util = require('util');
const PEG = require('pegjs');

const CPU = require('./cpu.js');

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
      // act as a dont-care bit. We then match this number against a
      // binary representation of the opcode including all
      // leading-zeroes in the `filter()` below. The set of matching
      // elements is the set of opcodes we need this entry to apply to
      // in handlers[].
      const toMatch = new RegExp('^' +
                                 insn.b1.bits
                                 .replace(/[A-Z]/g, '.')
                                 + '$');
      _.range(0, 0x100)
        .filter(op => !!(op | 0x1000).toString(2).slice(-8).match(toMatch))
        .forEach(op => {
          if (handlers[op]) 
            console.error(`\
In ${insn.mnemonic} handler, \
already defined for ${op.toString(16)}H as ${handlers[op].mnemonic}`);
          handlers[op] = insn;
        });
    });

    // Make sure we define all 256 handlers
    handlers
      .forEach((h, op) =>
               h || console.error(`Handler not defined for ${op.toString(16)}H`));

    // Generate the code for the simHandler(cpu, insnPC, op) function
    // for each opcode.
    handlers
      .map((h, op) => {
        h.pcIsAssigned = h.transfers.find(xfr => isVar(xfr.target, 'PC'));

        // Insert auto-increment of PC if it is not explicitly
        // assigned.
        if (!h.pcIsAssigned) {
          h.transfers.push({
            type: 'Transfer',
            target: {type: 'Var', id: 'PC'},
            e: {type: 'PLUS', l: {type: 'Var', id: 'PC'}, r: h.n},
          });
        }

        if (h.transfers.length === 0) {
          h.handlerSource = 'UNIMPLEMENTED OPCODE';
        } else {
          h.handlerSource = h.transfers
            .map(xfr => genTransfer(xfr, op))
            .join('\n');
        }
      });

    const handlersLog = handlers.map((h, op) => `\
${op.toString(16)}H: ${h.mnemonic} ${h.operands}
${h.handlerSource}
`).join('\n');

    fs.writeFileSync('handlers.log', handlersLog, {mode: 0o664});

    return handlers;


    ////////////////////////////////////////////////////////////////
    // Return true if specified item is the named variable.
    function isVar(item, id) {
      if (!item) return '/* isVar(null) */';
      return (item.type === 'Var' && item.id === id);
    }


    function symbolToCode(sym, op, params) {
      switch (sym) {
      case 'A': return 'cpu.SFR[ACC]';
      case 'B': return 'cpu.SFR[B]';
      case 'TMP': return 'cpu.tmp';
      case 'PC': return 'cpu.pc';
      case 'SP': return 'cpu.SFR[SP]';
      case 'DPTR': return 'cpu.dptr';
      case 'DIRECT': return `cpu.iram[${params.DIR}]`;
      case 'IMM': return `cpu.iram[${params.IMM}]`;
      case 'R': 
        const rsMask = '0x' + (CPU.pswBits.rs1 | CPU.pswBits.rs0).toString(16);
        return `cpu.iram[(cpu.SFR[PSW] & ${rsMask}) + ${params.op & 7}]`;

      default: return 'symbolToCode DEFAULT!'
      };
    }
    

    function genTransfer(xfr, op) {
      const t = xfr.target && xfr.target || xfr;

      switch (t.type) {
      case 'Var':
      case 'At':
      case 'Slash':
        return `${genTarget(t, op)} = ${genExpr(xfr.e, op)}`;

      case 'If':
        const thenTransfers = t.thenPart.map(x => genTransfer(x, op)).join('\n  ');
        const elseTransfers = (t.elsePart || []).map(x => genTransfer(x, op)).join('\n  ');

        let s = `\
if ${genExpr(xfr.e, op)} then
  ${thenTransfers}
`;

        if (t.elsePart) s += `else
  ${elseTransfers}
`;
        s += `\
endif`;

        return s;

      case 'Code':
        return `{ ${t.code} }`;

      default:
        return `\
UNKNOWN target type ${t.type}`;
      }
    }


    function genTarget(t, op) {

      switch (t.type) {
      case 'Var':

        switch(t.id) {
        case 'R':
          return `cpu.R${op & 7}`;

        case 'INDIRECT':
          return `cpu.atR${op & 1}`;

        default:
          return t.id;
        }

      case 'At':
        return `putAtGoesHere(${genTarget(t.e, op)})`;

      case 'Slash':
        return `${t.space}[${genExpr(t.addr, op)}]`;

      default:
        return `UNKNOWN target type ${t.type}`;
      }
    }


    function genExpr(e, op) {
      if (typeof e === 'number') return e.toString(10);

      if (!e) return `genExpr(null, ${op.mnemonic})`;
      if (!e.type) return `empty type op=${op.mnemonic}`;

      switch (e.type) {
      case 'Code':
        return `{ ${e.code}; }`;

      case 'At':
        return `INDIRECT ${e.e.id}`;

      case 'Slash':
        return `${e.space}[${genExpr(e.addr, op)}]`;

      case 'Var':
        return e.id;

      case 'PLUS':
        return genBinary(e, '+', op);

      case 'MINUS':
        return genBinary(e, '-', op);

      case 'EQ':
        return genBinary(e, '===', op);

      case 'NE':
        return genBinary(e, '!==', op);

      case 'LT':
        return genBinary(e, '<', op);

      case 'GT':
        return genBinary(e, '>', op);

      case 'ANDAND':
        return genBinary(e, '&&', op);

      case 'OROR':
        return genBinary(e, '||', op);

      case 'AND':
        return genBinary(e, '&', op);

      case 'OR':
        return genBinary(e, '|', op);

      case 'XOR':
        return genBinary(e, '^', op);

      case 'Not':
        return `!${genExpr(e.e, op)}`;

      default:
        return `UNKNOWN genExpr(${e.type}, ${op.mnemonic})`;
      }
    }


    function genBinary(e, operator, op) {
      return `${genExpr(e.l, op)} ${operator} ${genExpr(e.r, op)}`;
    }
  }
}
