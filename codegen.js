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
    const handlersLog = handlers.map((h, op) => {
      h.handlerSource = codegenOpcode(h, op);
      return `\
${op.toString(16)}H: ${h.mnemonic} ${h.operands}
${h.handlerSource}
`;
    }).join('\n');

    fs.writeFileSync('handlers.log', handlersLog, {mode: 0o664});
    return handlers;
  }
};


// Generate the code for the specified opcode `op` for Instruction `h`
// and place that code into `h.handlerSource`.
function codegenOpcode(h, op) {
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

  if (h.transfers.length === 0) return 'UNIMPLEMENTED OPCODE';

  return h.transfers
    .map(xfr => genTransfer(xfr))
    .join('\n');


  ////////////////////////////////////////////////////////////////
  // Return true if specified item is the named variable.
  function isVar(item, id) {
    if (!item) return '/* isVar(null) */';
    return (item.type === 'Var' && item.id === id);
  }


  function symbolToCode(sym, params) {

    switch (sym) {
    case 'A': return 'cpu.SFR[ACC]';
    case 'B': return 'cpu.SFR[B]';
    case 'TMP': return 'cpu.tmp';
    case 'PC': return 'cpu.pc';
    case 'SP': return 'cpu.SFR[SP]';
    case 'DPTR': return 'cpu.dptr';

    case 'IMM':
      return params.IMM;

    case 'BIT':
    case 'DIR':
    case 'DIRSRC':
    case 'DIRDST':
      return `cpu.iram[${params[sym]}]`;

    case 'RELA':
      return `cpu.toSigned(${params.RELA})`;

    case 'R': 
      const rsMask = '0x' + (CPU.pswBits.rs1Mask | CPU.pswBits.rs0Mask).toString(16);
      return `cpu.iram[(cpu.SFR[PSW] & ${rsMask}) + ${params.b1Value & 7}]`;

    default: return 'symbolToCode DEFAULT!'
    };
  }


  // For the current Instruction, create the parameters object
  // containining the values from the instruction's encoding to be
  // used during the codegen and execution of the instruction. For
  // example, for an instruction with an IMM immediate value in its
  // encoding, the `IMM` property will be filled in with the code to
  // fetch that value from the code stream.
  function instructionParams() {
    const b1Value = extractInstructionField();
    const params = {b1Value};

    ['-never-match-placeholder-', 'b2', 'b3'].forEach((byte, offset) => {
      let code;

      if (!h[byte] || h[byte].type !== 'SYMBOL') return;
        
      switch (h[byte].sym) {
      case 'IMM':
      case 'DIR':
      case 'DIRSRC':
      case 'DIRDST':
      case 'HI':
      case 'LO':
      case 'RELA':
      case 'BIT':
        params[h[byte].sym] = `cpu.code[cpu.pc + ${offset}] /* ${h[byte].sym} */`;
        break;

      default:
        console.log(`Unhandled Instruction byte symbol ${h[byte].sym}`);
        code = `/* UNHANDLED ${h[byte].sym} */`;
        break;
      }
    });

    return params;
  }


  // Given the current Instruction uses a `b1` encoding like
  // `10111RRR`, extract the value from `op` containing the bits
  // `RRR` and return them or return `null` if there are no embedded
  // letters in the encoding.
  function extractInstructionField() {
    const b1Match = h.b1.bits.match(/([A-Z]+)/);
    if (!b1Match) return null;
    const nBits = b1Match[1].length;
    const topBitNumber = 7 - b1Match.index;
    const mask = ((1 << nBits) - 1) << (topBitNumber - nBits + 1);
    return op & mask;
  }


  function genTransfer(xfr) {
    const t = xfr.target && xfr.target || xfr;

    switch (t.type) {
    case 'Var':
    case 'At':
    case 'Slash':
      return `${genTarget(t)} = ${genExpr(xfr.e)}`;

    case 'If':
      const thenTransfers = t.thenPart.map(x => genTransfer(x)).join('\n  ');
      const elseTransfers = (t.elsePart || []).map(x => genTransfer(x)).join('\n  ');

      let s = `\
if ${genExpr(xfr.e)} then
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


  function genTarget(t) {

    switch (t.type) {
    case 'Var':
      return symbolToCode(t.id, instructionParams());

    case 'At':
      return `putAtGoesHere(${genTarget(t.e)})`;

    case 'Slash':
      return `${t.space}[${genExpr(t.addr)}]`;

    default:
      return `UNKNOWN target type ${t.type}`;
    }
  }


  function genExpr(e) {
    if (typeof e === 'number') return e.toString(10);

    if (!e) return `genExpr(null, ${op.mnemonic})`;
    if (!e.type) return `empty type op=${op.mnemonic}`;

    switch (e.type) {
    case 'Code':
      return `{ ${e.code}; }`;

    case 'At':
      return `INDIRECT ${e.e.id}`;

    case 'Slash':
      return `${e.space}[${genExpr(e.addr)}]`;

    case 'Var':
      return e.id;

    case 'PLUS':
      return genBinary(e, '+');

    case 'MINUS':
      return genBinary(e, '-');

    case 'EQ':
      return genBinary(e, '===');

    case 'NE':
      return genBinary(e, '!==');

    case 'LT':
      return genBinary(e, '<');

    case 'GT':
      return genBinary(e, '>');

    case 'ANDAND':
      return genBinary(e, '&&');

    case 'OROR':
      return genBinary(e, '||');

    case 'AND':
      return genBinary(e, '&');

    case 'OR':
      return genBinary(e, '|');

    case 'XOR':
      return genBinary(e, '^');

    case 'Not':
      return `!${genExpr(e.e)}`;

    default:
      return `UNKNOWN genExpr(${e.type}, ${op.mnemonic})`;
    }
  }


  function genBinary(e, operator) {
    return `${genExpr(e.l)} ${operator} ${genExpr(e.r)}`;
  }
}
