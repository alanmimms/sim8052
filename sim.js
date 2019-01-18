'use strict';

// For `put` style functions, convention is put(address, value).
// For `get` convention is get(address).

const fs = require('fs');
const util = require('util');
const _ = require('lodash');
const readline = require('readline');
const CPU = require('./cpu.js');

const CODEGEN = require('./codegen');

const {toHex1, toHex2, toHex4} = require('./simutils.js');


const debugBASIC2 = false;
const debugTB51 = true;


const insnsPerTick = 100;

const CODESize = 65536;
const XRAMSize = 65536;


// Table of opcode information and handlers for disassembly and
// simulation of the instruction whose opcode is the index.
var opcodes;


const ACC = CPU.ACC;
const B = CPU.B;
const SP = CPU.SP;
const P0 = CPU.P0;
const P1 = CPU.P1;
const P2 = CPU.P2;
const P3 = CPU.P3;
const IP = CPU.IP;
const IE = CPU.IE;
const TMOD = CPU.TMOD;
const TCON = CPU.TCON;
const T2CON = CPU.T2CON;
const T2MOD = CPU.T2MOD;
const TH0 = CPU.TH0;
const TL0 = CPU.TL0;
const TH1 = CPU.TH1;
const TL1 = CPU.TL1;
const TH2 = CPU.TH2;
const TL2 = CPU.TL2;
const RCAP2H = CPU.RCAP2H;
const RCAP2L = CPU.RCAP2L;
const PCON = CPU.PCON;
const PSW = CPU.PSW;
const DPL = CPU.DPL;
const DPH = CPU.DPH;
const SCON = CPU.SCON;
const SBUF = CPU.SBUF;


const {pswBits, sconBits, parityTable, mathMask, rsMask} = CPU;


// These are done first so we can construct a Proxy to access it.
const iram = Buffer.alloc(0x100, 0x00, 'binary');
const xram = Buffer.alloc(XRAMSize, 0x00, 'binary');
const SFR = Buffer.alloc(0x100, 0x00, 'binary');
const code = Buffer.alloc(CODESize, 0x00, 'binary');


const cpu = {

  // Program counter - invisible to software in most ways
  pc: 0,

  // Code (program) memory.
  code,

  // Internal RAM
  iram,

  // SFRs. Even though this is 256 bytes, only 0x80..0xFF are used.
  SFR,

  // External (data) memory.
  xram,

  // Interrupt priority level.
  // -1: No interrupt in progress.
  // 0: Low priority in progress.
  // 1: High priority in progress.
  ipl: -1,

  // Temporary value used during some instructions
  tmp: 0,

  // Serial port input queue
  sbufQueue: [],

  // Simulator state and control
  tracing: false,
  running: true,
  mayDelay: false,

  // Statistics
  instructionsExecuted: 0,
  executionTime: 0,

  debugFlags: `debugSCON debugDirect`.split(/\s+/),

  debugSCON: false,
  debugDirect: false,


  // Trace of PC instruction fetches
  fetchHistoryMask: 255,
  fetchHistory: new Array(256),
  fetchHistoryX: -1,            // Always points to most recent entry


  // Trace of PC changes via jump and call instructions. Each element
  // is an object {from, to} containing the PC values involved.
  branchHistoryMask: 255,
  branchHistory: new Array(256),
  branchHistoryX: -1,           // Always points to most recent entry


  // Get/set low nybble of IRAM location
  iramNYBLO: new Proxy(iram, {

    // Set low nybble of IRAM location
    set(target, ea, value) {
      iram[ea] = iram[ea] & ~0x0F | value & 0x0F;
    },

    // Get low nybble of IRAM location
    get: (target, ea, value) => iram[ea] & 0x0F,
  }),


  // Get/set low and high byte or page field of PC
  set pcLO(v) {
    cpu.pc = cpu.pc & ~0xFF | v & 0xFF;
  },

  get pcLO() {
    return cpu.pc & 0xFF;
  },

  set pcHI(v) {
    cpu.pc = cpu.pc & ~0xFF00 | (v << 8) & 0xFF00;
  },

  get pcHI() {
    return cpu.pc & 0xFF00;
  },


  set pcPAGE(v) {
    cpu.pc = cpu.pc & ~0x7FF | v & 0x7FF;
  },

  get pcPAGE() {
    return cpu.pc & 0x7FF;
  },


  get CY() {
    return +!!(this.psw & pswBits.cyMask);
  },

  get AC() {
    return +!!(this.psw & pswBits.acMask);
  },

  get OV() {
    return +!!(this.psw & pswBits.ovMask);
  },


  set CY(v) {

    if (v)
      this.psw |= pswBits.cyMask;
    else
      this.psw &= ~pswBits.cyMask;
  },


  set AC(v) {

    if (v)
      this.psw |= pswBits.acMask;
    else
      this.psw &= ~pswBits.acMask;
  },


  set OV(v) {

    if (v)
      this.psw |= pswBits.ovMask;
    else
      this.psw &= ~pswBits.ovMask;
  },


  getSFR(sfr) {

    switch (sfr) {
    case SBUF:
      return this.sbufQueue.length ? this.sbufQueue.shift() : 0x00;

    case PSW:
      let psw = this.SFR[PSW];

      // Update parity before returning PSW
      if (parityTable[this.SFR[ACC]] << pswBits.pShift)
        psw |= pswBits.pMask;
      else
        psw &= ~pswBits.pMask;

      this.SFR[PSW] = psw;
      return psw;

    case P3:
      let p3 = this.SFR[P3];
      p3 ^= 1;
      this.SFR[P3] = p3;          // Fake RxD toggling
      return p3;

    case SCON:
      return this.SFR[SCON] | +(this.sbufQueue.length !== 0) << sconBits.riShift;
      break;

    default:
      return this.SFR[sfr];
    }
  },


  putSFR(sfr, v) {

    switch (sfr) {
    case SBUF:
      process.stdout.write(String.fromCharCode(v));

      // Transmitting a character immediately signals TI saying it is done.
      this.putDirect(SCON, this.getDirect(SCON) | sconBits.tiMask);

      // TODO: Make this do an interrupt
      break;

    case SCON:
      if (this.debugSCON) console.log(`putDirect SCON now=${toHex2(v)}`);

      // Fall through...
      
    default:
      this.SFR[sfr] = v;
      break;
    }
  },


  get DPTR() {
    return this.SFR[DPH] << 8 | this.SFR[DPL];
  },


  set DPTR(v) {
    v &= 0xFFFF;
    this.SFR[DPL] = v;
    this.SFR[DPH] = v >>> 8;
  },


  doADD(op, b) {
    const c = (op & 0x10) ? this.getCY() : 0;
    const a = this.SFR[ACC]

    const acValue = +(((a & 0x0F) + (b & 0x0F) + c) > 0x0F);
    const c6Value = +!!(((a & 0x7F) + (b & 0x7F) + c) & 0x80);
    const cyValue = +(a + b + c > 0xFF);
    const ovValue = cyValue ^ c6Value;

    this.SFR[PSW] &= ~mathMask;
    this.SFR[PSW] |= ovValue << pswBits.ovShift |
      acValue << pswBits.acShift |
      cyValue << pswBits.cyShift;
    this.SFR[ACC] = a + b + c;
  },


  doSUBB(op, b) {
    const c = this.getCY();
    const toSub = b + c;
    const a = this.SFR[ACC];
    const result = (a - toSub) & 0xFF;

    const cyValue = +(a < toSub);
    const acValue = +((a & 0x0F) < (toSub & 0x0F) ||
                      (c && ((b & 0x0F) == 0x0F)));
    const ovValue = +((a < 0x80 && b > 0x7F && result > 0x7F) ||
                      (a > 0x7F && b < 0x80 && result < 0x80));

    this.SFR[PSW] &= ~mathMask;
    this.SFR[PSW] |= ovValue << pswBits.ovShift |
      acValue << pswBits.acShift |
      cyValue << pswBits.cyShift;
    this.SFR[ACC] = a - toSub;
  },


  toSigned(v) {
    return v & 0x80 ? v - 0x100 : v;
  },


  getR(r) {
    const ra = (this.SFR[PSW] & rsMask) + r;
    return this.iram[ra];
  },


  putR(r, v) {
    const ra = (this.SFR[PSW] & rsMask) + r;
    this.iram[ra] = v;
  },


  // Direct accesses in 0x00..0x7F are internal RAM.
  // Above that, direct accesses are to SFRs.
  getDirect(ra) {
    if (ra < 0x80)
      return this.iram[ra];
    else
      return this.getSFR(ra);
  },


  // Direct accesses in 0x00..0x7F are internal RAM.
  // Above that, direct accesses are to SFRs.
  putDirect(ra, v) {

    if (ra < 0x80) {
      this.iram[ra] = v;
    } else {
      this.putSFR(ra, v);
    }

    if (this.debugDirect) console.log(`${displayableAddress(ra, 'd')} is now ${toHex2(v)}`);
  },


  getIndirect(r) {
    return this.iram[this.getR(r)];
  },


  putIndirect(r, v) {
    this.iram[this.getR(r)] = v;
  },


  getBitAddrMask(bn) {
    const bm = 1 << (bn & 0x07);
    const ra = bn < 0x10 ? 0x20 + (bn >>> 3) : bn & 0xF8;
    return {ra, bm};
  },
  

  getBit(bn) {
    const {ra, bm} = this.getBitAddrMask(bn);
    const v = +!!(this.getDirect(ra) & bm);

    // If we are spinning waiting for SCON.RI to go high we can
    // introduce a bit of delay.
    if (bn === sconBits.riBit && !v) cpu.mayDelay = true;

    return v;
  },


  putBit(bn, b) {
    const {ra, bm} = this.getBitAddrMask(bn);
    let v = this.getDirect(ra);

    if (b) {
      v = v | bm;
    } else {
      v = v & ~bm;
    }

    this.putDirect(ra, v);
  },


  getCode(ca) {
    return this.code[ca];
  },


  getXData(xa) {
    return this.xram[xa];
  },


  putXData(xa, v) {
    this.xram[xa] = v;
  },


  bitName(bn) {
    bn = +bn;

    if (bn < 0x80) {
      return toHex2(bn);
    } else {
      return `${displayableAddress(bn & 0xF8, 'b')}.${bn & 0x07}`;
    }
  },


  dumpFetchHistory() {
    console.log(`Fetch history (oldest first):`);

    for (let k = this.fetchHistoryMask; k; --k) {
      const x = (this.fetchHistoryX - k) & this.fetchHistoryMask;
      console.log(`-${toHex2(k+1)}: ${displayableAddress(this.fetchHistory[x], 'c')}`);
    }
  },
  

  dumpBranchHistory() {
    console.log(`Branch history (oldest first):`);

    // To enable padding for readability, find maximum width of all of
    // the `from` and `to` values we will display.
    const entries = this.branchHistory.filter(bh => bh);
    const fWidth = entries
          .reduce((prevMax, cur) =>
                  Math.max(prevMax, displayableAddress(cur.from, 'c').length), 0);
    const tWidth = entries
          .reduce((prevMax, cur) =>
                  Math.max(prevMax, displayableAddress(cur.to, 'c').length), 0);

    for (let k = this.branchHistoryMask; k >= 0; --k) {
      const x = (this.branchHistoryX - k) & this.branchHistoryMask;
      const bh = this.branchHistory[x];
      if (!bh) continue;
      console.log(`\
${displayableAddress(bh.from, 'c').padStart(fWidth)}: \
${bh.opName.padEnd(5)} \
${displayableAddress(bh.to, 'c').padEnd(tWidth)} \
${briefState(bh.state)}`);
    }

    console.log('');
  },
  

  disassemble(pc) {
    const op = this.code[pc];
    const ope = opcodes[op];

    if (!ope) {
      console.log(`Undefined opcodes[${op}] pc=${pc}`);
      this.dumpFetchHistory();
    }

    const nextPC = pc + ope.n;
    const bytes = this.code.slice(pc, nextPC);

    const disassembly = bytes.toString('hex')
          .toUpperCase()
          .match(/.{2}/g)
          .join(' ')
          .padEnd(10);
    
    const handlers = {
      bit: x => displayableBit(bytes[+x]),
      nbit: x => '/' + displayableBit(bytes[+x]),
      immed: x => '#' + toHex2(bytes[+x]),
      immed16: x => '#' + toHex4(bytes[+x] << 8 | bytes[+x+1]),
      addr16: x => displayableAddress(bytes[+x] << 8 | bytes[+x+1], 'c'),
      addr11: x => displayableAddress((nextPC & 0xF800) | ((op & 0xE0) << 3) | bytes[+x], 'c'),
      verbatum: x => x,
      direct: x => displayableAddress(bytes[+x], 'd'),
      rela: x => displayableAddress(nextPC + this.toSigned(bytes[+x]), 'c'),
      Ri: () => 'R' + (op & 7).toString(),
      '@Ri': () => '@R' + (op & 1).toString(),
    };

    const opcodeHandlers = {Ri: 'Ri', '@Ri': '@Ri'};

    const operands = ope.operands.split(/,/)
          .map(opnd => {
            let [offset, handler] = opnd.split(/:/);
            handler = handler || opcodeHandlers[offset] || 'verbatum';
            return {handler, offset};
          })
          .map(x => handlers[x.handler](x.offset))
          .join(',');

    return `\
${displayableAddress(pc, 'c').padStart(28)}: \
${disassembly}  ${ope.mnemonic.padEnd(6)} ${operands}`;
  },


  dumpState() {
    console.log(`\
 a=${toHex2(this.SFR[ACC])}   b=${toHex2(this.SFR[B])}  cy=${+this.getCY()} ov=${+this.getOV()} ac=${this.getAC()}  \
sp=${toHex2(this.SFR[SP])} psw=${toHex2(this.SFR[PSW])}  dptr=${toHex4(this.getDPTR())}  \
pc=${toHex4(this.pc)}
${_.range(0, 8)
  .map((v, rn) => `r${rn}=${toHex2(this.getR(rn))}`)
  .join('  ')
}`);
  },

  dumpCount: 50,


  captureState() {
    const rBase = this.SFR[PSW] & rsMask;
    const state = {
      a: this.SFR[ACC],
      b: this.SFR[B],
      cy: this.getCY(),
      ov: this.getOV(),
      ac: this.getAC(),
      sp: this.SFR[SP],
      psw: this.SFR[PSW],
      dptr: this.getDPTR(),
      regs: [...this.iram.slice(rBase, rBase+8)],
    };

    return state;
  },


  // Called whenever we change the PC via instruction or command. `opName`
  // is the opcode/command that caused the change.
  saveBranchHistory(from, to, opName) {
    this.branchHistoryX = (this.branchHistoryX + 1) & this.branchHistoryMask;
    this.branchHistory[this.branchHistoryX] = {from, to, opName, state: this.captureState()};
  },
  

  run1(insnPC) {
    this.pc = insnPC;

    this.fetchHistoryX = (this.fetchHistoryX + 1) & this.fetchHistoryMask;
    this.fetchHistory[this.fetchHistoryX] = this.pc;

    const op = this.code[this.pc++];
    ++this.instructionsExecuted;

    if (debugBASIC2 && this.pc === 0x1F04) {
      if (this.dumpCount-- === 0) this.running = false;
      console.log(`RSUB1-2=1F04H: in=${toHex2(this.getR(2))}${toHex2(this.getR(0))}`);
      console.log(`    called from ${toHex2(this.iram[this.SFR[SP]])}${toHex2(this.iram[this.SFR[SP]-1])}`);
    }

    if (debugBASIC2 && this.pc === 0x1F2C) {
      console.log(`1F2C:        R2,R0=${toHex2(this.getR(2))}${toHex2(this.getR(0))}`);
    }

    if (debugBASIC2 && this.pc === 0x1F3C) {
      console.log(`1F3C:                   RETURN`);
    }

    const ope = opcodes[op];
    const handler = ope.simHandler;
    handler(this, insnPC, op);
  },
};


var lastX = 0;
var lastLine = "";

let startOfLastStep = 0;

// Keys of this are addresses for the specified type of access
// that should cause a breakpoint stop. The value is an object:
// * msg = Message to print when stopping at this point
// * transient = Boolean to indicate breakpoint is self-clearing
let stopReasons = {
  code: {},                     // PC code fetch
  iramR: {},                    // Internal RAM read
  iramW: {},                    // Internal RAM write
  sfrR: {},                     // SFR read
  sfrW: {},                     // SFR write
  xdataR: {},                   // External data read
  xdataW: {},                   // External data write
};


// User can enter short substrings, and it's not the unambiguous match
// but rather the first (case-insensitive) match that is used. Put
// these in order of precedence in case of ambiguity of the shortened
// name.
const commands = [
  {name: 'dump',
   description: 'Dump processor state',
   doFn: doDump,
  },
  
  {name: 'step',
   description: 'Step N times, where N is 1 if not specified',
   doFn: doStep,
  },

  {name: 'go',
   description: 'Continue execution starting at specified PC or current PC if not specified.',
   doFn: doGo,
  },

  {name: 'til',
   description: 'Continue execution starting at specified PC or current PC if not specified.',
   doFn: doTil,
  },

  {name: 'break',
   description: 'Set breakpoint at specified address.',
   doFn: doBreak,
  },

  {name: 'blist',
   description: 'List breakpoints.',
   doFn: doBreakList,
  },

  {name: 'unbreak',
   description: 'Clear breakpoint at specified address.',
   doFn: doUnbreak,
  },

  {name: 'mem',
   description: 'Display external memory at specified address.',
   doFn: doMem,
  },

  {name: 'code',
   description: 'Display code memory at specified address.',
   doFn: doCode,
  },

  {name: 'history',
   description: 'Display history of PC.',
   doFn: () => cpu.dumpFetchHistory(),
  },

  {name: 'bhistory',
   description: 'Display history of branches.',
   doFn: () => cpu.dumpBranchHistory(),
  },

  {name: 'sfr',
   description: 'Display SFR at specified address.',
   doFn: doSFR,
  },

  {name: 'iram',
   description: 'Display IRAM at specified address.',
   doFn: doIRAM,
  },

  {name: 'list',
   description: 'Disassemble memory at specified address.',
   doFn: doList,
  },

  {name: 'over',
   description: 'Execute through a call, stopping when execution returns to +1, +2, or +3.',
   doFn: doOver,
  },

  {name: 'quit',
   description: 'Exit the emulator.',
   doFn: doQuit,
  },

  {name: 'debug',
   description: `\
With no args, display current registered simulator debug flags and their values.
With arguments, set specified flag to specified value. If value is unspecified, toggle.\
`,
   doFn: doDebug,
  },

  {name: 'stats',
   description: 'Display statistics we capture.',
   doFn: doStats,
  },

  {name: 'help',
   description: 'Get a list of available commands and description of each.',
   doFn: doHelp,
  },
];


function curInstruction() {
  return cpu.disassemble(cpu.pc);
}


function handleLine(line) {
  const parseLine = () => line.toLowerCase().trim().split(/\s+/);
  let words = parseLine();

  if ((words.length === 0 || words[0].length === 0) && lastLine != 0) {
    line = lastLine;
    words = parseLine();
  }

  let cmd = words[0] || '?';

  lastLine = line;

  var cmdX = commands.findIndex(c => c.name.indexOf(cmd) === 0);

  if (cmdX >= 0) {
    commands[cmdX].doFn(words);
  } else {
    doHelp();
  }

  if (rl) rl.question(`${curInstruction()} > `, handleLine);
}


const OFFSET_THRESHOLD = 0x80;

function findClosestSymbol(x, space) {
  let closestOffset = Number.POSITIVE_INFINITY;
  let closestSym = null;

  Object.values(syms[space]).forEach(sym => {
    const offset = x - sym.addr;

    if (offset >= 0 && offset < closestOffset) {
      closestSym = sym;
      closestOffset = offset;
    }
  });

  if (closestSym && closestOffset < OFFSET_THRESHOLD) {
    return [closestSym, closestOffset];
  } else {
    return [];
  }
}


// Return a compact display strong for the state captured by
// cpu.captureState().
// A=XX B=XX SP=XX PSW=XX CoA DPTR=XXXX R:XX XX XX XX  XX XX XX XX
function briefState(s) {
  return `\
A=${toHex2(s.a)} \
B=${toHex2(s.b)} \
SP=${toHex2(s.sp)} \
PSW=${toHex2(s.psw)} \
${s.cy ? 'C' : 'c'}${s.ov ? 'O' : 'o'}${s.ac ? 'A' : 'a'} \
DPTR=${toHex4(s.dptr)} \
R:${s.regs.map((v, x) => toHex2(v) + (x === 3 ? ' ' : '')).join(' ')}`;
}


function displayableBit(ba) {
  let [closestSym, closestOffset] = findClosestSymbol(ba, 'b');

  if (closestSym && closestOffset === 0) {
    return `${closestSym.name}=${toHex2(ba)}`;
  } else if (closestSym && closestOffset < 8 && (closestSym.addr & 0xF8) === 0) {
    return `${closestSym.name}.${closestOffset}=${toHex2(ba)}`;
  } else {
    return toHex2(ba) + 'H';
  }
}


function displayableAddress(x, space = 'c') {
  const [closestSym, closestOffset] = findClosestSymbol(x, space);

  if (closestSym) {
    return closestSym.name + (closestOffset ? "+" + toHex4(closestOffset) : "") +
      `=${toHex4(x)}`;
  } else {
    return toHex4(x) + 'H';
  }
}


function doMem(words) {
  let x, endAddress;
  let n = 0;

  if (words.length < 2) {
    x = ++lastX;
  } else {
    x = getAddress(words);

    if (words.length > 2) {
      endAddress = Math.min(x + parseInt(words[2], 16), 0x10000);
    } else {
      endAddress = x + 1;
    }
  }

  let longestAddr = 0;
  const addrs = [];
  const lines = [];
  let line = '';
  lastX = x;

  while (x < endAddress) {

    if ((n++ & 0x0F) === 0) {
      if (line.length > 0) lines.push(line);
      const addr = displayableAddress(x, 'x') + ':';
      if (addr.length > longestAddr) longestAddr = addr.length;
      addrs.push(addr);
      line = '';
    }

    if (((n - 1) & 0x07) === 0) line += ' ';
    line += ' ' + toHex2(cpu.xram[x++]);
  }

  if (line.length > 0) lines.push(line);

  console.log(lines
              .map((L, lineX) => _.padStart(addrs[lineX], longestAddr) + L)
              .join('\n'));
}


function doCode(words) {
  let x;

  if (words.length < 2) {
    x = ++lastX;
  } else {
    x = getAddress(words);
  }

  const addr = displayableAddress(x, 'c');
  console.log(`${addr}: ${toHex2(cpu.code[x])}`);
  lastX = x;
}


function doSFR(words) {
  let x;
  let w;

  if (words.length < 2) {
    x = ++lastX;
  } else {
    x = getAddress(words);
  }

  w = cpu.getDirect(x);

  let addr = displayableAddress(x, 'd');
  console.log(`${addr}: ${toHex2(w)}`);
  lastX = x;
}


function doIRAM(words) {
  let x, endAddress;
  let n = 0;

  if (words.length < 2) {
    x = ++lastX;
  } else {
    x = getAddress(words);

    if (words.length > 2) {
      endAddress = Math.min(x + parseInt(words[2], 16), 0x100);
    } else {
      endAddress = x + 1;
    }
  }

  let longestAddr = 0;
  const addrs = [];
  const lines = [];
  let line = '';
  lastX = x;

  while (x < endAddress) {

    if ((n++ & 0x0F) === 0) {
      if (line.length > 0) lines.push(line);
      const addr = displayableAddress(x, 'd') + ':';
      if (addr.length > longestAddr) longestAddr = addr.length;
      addrs.push(addr);
      line = '';
    }

    if (((n - 1) & 0x07) === 0) line += ' ';
    line += ' ' + toHex2(cpu.iram[x++]);
  }

  if (line.length > 0) lines.push(line);

  console.log(lines
              .map((L, lineX) => _.padStart(addrs[lineX], longestAddr) + L)
              .join('\n'));
}


function doList(words) {
  let x, n = 10;

  if (words.length < 2) {
    const op = cpu.code[lastX];
    const ope = opcodes[op];
    x = lastX + ope.n;
  } else {
    x = getAddress(words);
    if (words.length > 2) n = parseInt(words[1]);
  }

  for (; n; --n, ++x) console.log(`${cpu.disassemble(x).padStart(40)}`);
  lastX = x;
}


function doDebug(words) {

  if (words.length === 1) {
    const maxWidth = cpu.debugFlags
      .reduce((prev, cur) => cur.length > prev ? cur.length : prev, 0);
    console.log("\nCurrent debug flags and their values:\n");
    cpu.debugFlags.forEach(f => {
      console.log(`  ${_.padStart(f, maxWidth)}: ${cpu[f]}`);
    });
    console.log("");
  } else {
    const flc = words[1].toLowerCase();
    let f = cpu.debugFlags.find(f => f.toLowerCase() === flc);

    if (!f) {
      console.log(`Unknown debug flag '${flc}'.`);
      return;
    } else {

      if (words.length < 3)
	cpu[f] = !cpu[f];	// Toggle if not specified
      else
        cpu[f] = !!words[2];
    }

    console.log(`${f} is now ${cpu[f]}.`);
  }
}


function doDump(words) {
  cpu.dumpState();
}


function doGo(words) {
  const b = words.length >= 2 ? getAddress(words) : cpu.pc;

  if (b !== cpu.pc) {
    cpu.saveBranchHistory(cpu.pc, b, 'go');
    cpu.pc = b;
  }

  startOfLastStep = cpu.instructionsExecuted;
  run(b);
}


function doTil(words) {

  if (words.length !== 2) {
    console.log("Must specify an address to go Til");
  } else {
    const b = getAddress(words);
    const bAsHex = toHex4(b);

    stopReasons.code[b] = {
      msg: 'now at ' + bAsHex,
      transient: true,
    };

    console.log(`[Running until ${bAsHex}]`);
    startOfLastStep = cpu.instructionsExecuted;
    run(cpu.pc);
  }
}


function doBreak(words) {

  if (words.length !== 2) {
    console.log("Must specify an address for breakpoint");
  } else {
    const b = getAddress(words);
    const bAsHex = toHex4(b);

    stopReasons.code[b] = {
      msg: 'breakpoint at ' + bAsHex,
      transient: false,
    };
  }
}


function doBreakList(words) {
  const addrs = Object.keys(stopReasons.code);

  if (addrs.length === 0) {
    console.log('No breakpoints');
  } else {

    const maxWidth = addrs
          .reduce((prevMax, a) => 
                  Math.max(prevMax, displayableAddress(a, 'c').length), 0);

    console.log('Current Breakpoints:\n' +
                addrs
                .sort((a, b) => parseInt(a, 16) - parseInt(b, 16))
                .map((b, bn) => `\
${('[' + (bn+1)).padStart(3) + ']'} \
${displayableAddress(b, 'c').padStart(maxWidth)}: \
${stopReasons.code[b].msg}\
${stopReasons.code[b].transient ? ' [transient]' : ''}`)
                .join('\n'), '\n');
  }
}


function doUnbreak(words) {

  if (words.length !== 2) {
    console.log("Must specify an address to clear breakpoint");
  } else {
    const b = getAddress(words);
    delete stopReasons.code[b];
  }
}


function doStep(words) {
  const n = (words.length > 1) ? parseInt(words[1]) : 1;
  startOfLastStep = cpu.instructionsExecuted;
  run(cpu.pc, n);
}


const stepOverRange = 0x10;

function doOver(words) {
  _.range(1, stepOverRange)
    .forEach(offs => stopReasons.code[cpu.pc + offs] = ({
      msg: `stepped over to $+${toHex2(offs)}H`,
      transient: true,
    }));

  startOfLastStep = cpu.instructionsExecuted;
  run(cpu.pc);
}


function doQuit(words) {
  if (rl) rl.close();
  console.log("[Exiting]");
  process.exit(0);
}


function doStats(words) {
  console.log(`Instructions executed: ${cpu.instructionsExecuted}`);
}


function doHelp(words) {

  if (!words || words.length === 1) {
    const maxWidth = commands.map(c => c.name)
      .reduce((prev, cur) => cur.length > prev ? cur.length : prev, 0);

    console.log("\nCommands:\n" + 
		commands
		.map(c => (_.padStart(c.name, maxWidth) + ': ' +
			   c.description.replace(/\n/g, '\n  ' +
						 _.padStart('', maxWidth))))
		.join('\n'));
  } else {
    const cx = commands.findIndex(c => c.name.indexOf(words[1]) === 0);

    if (cx < 0)
      console.log(`Unknown command ${words[1]}`);
    else
      console.log(commands[cx].description);
  }
}


function getAddress(words) {
  if (words.length < 2) return cpu.pc;

  switch (words[1]) {
  case 'pc':
    return cpu.pc;

  case '.':
    return lastX;

  default:
    return parseInt(words[1], 16);
  }
}


// Our readline interface instance used for command line interactions.
var rl;


function stopCLI() {
  if (rl) rl.close();
  rl = null;

  if (process.stdin.setRawMode) { // This is not defined if debugging
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', sbufKeypressHandler);
    process.stdin.resume();
  }
}


function startCLI() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer: line => {
      const completions = commands.map(c => c.name);
      const hits = completions.filter(c => c.indexOf(line) === 0);
      return [hits.length ? hits : completions, line];
    },
  });

  if (process.stdin.setRawMode) {
    process.stdin.removeListener('keypress', sbufKeypressHandler);
    process.stdin.setRawMode(false);
  }

  // Note ^C to allow user to regain control from long execute loops.
  rl.on('SIGINT', () => {
    console.log("\n[INTERRUPT]\n");
    cpu.running = false;
    startCLI();
  });

  rl.question(`${curInstruction()} > `, handleLine);
}


function sbufRx(c) {

  // Ignore characters if receiver is not enabled
  if ((cpu.SFR[SCON] & sconBits.renMask) === 0) return;

  cpu.sbufQueue.push(c);

  // TODO: Make this do RI interrupt
}


function sbufKeypressHandler(ch, key) {

  if (ch != null) {
    let c = ch.charCodeAt(0);

    // Stop with C-\ keypress
    if (c === 0x1c) {
      cpu.running = false;
    } else {
      sbufRx(c);
    }
  } else if (key.sequence) {

    // Tail-recursively send key inputs for each character in the sequence.
    function spoolOutKeySequence(seq) {
      let c = seq.charCodeAt(0);

      sbufRx(c);

      if (seq.length > 1) {
	seq = seq.slice(1);
	setImmediate(spoolOutKeySequence, seq);
      }
    }

    setImmediate(spoolOutKeySequence, key.sequence.slice(0));
  }
}


function run(pc, maxCount = Number.POSITIVE_INFINITY) {
  const startCount = cpu.instructionsExecuted;
  const startTime = process.hrtime();

  cpu.pc = pc;
  cpu.running = true;

  let skipBreakIfTrue = true;

  stopCLI();
  setImmediate(runAsync);

  function runAsync() {

    for (let n = insnsPerTick; cpu.running && n; --n) {

      if (!skipBreakIfTrue && stopReasons.code[cpu.pc]) {
	console.log(`[${stopReasons.code[cpu.pc].msg}]`); // Say why we stopped
        cpu.running = false;

        const match = stopReasons.code[cpu.pc].msg
              .match(/^stepped over to \$\+([0-9A-F]+)H/);

        // If we stepped over to, say, "stepped over to $+5" then we
        // have to delete breakpoints before this point as well.
        if (match) {
          const atOffset = parseInt(match[1], 16);
          _.range(-atOffset, stepOverRange-atOffset)
            .forEach(offs => delete stopReasons.code[cpu.pc+offs]);
        } else {
          if (stopReasons.code[cpu.pc].transient) delete stopReasons.code[cpu.pc];
        }
      } else {
	let beforePC = cpu.pc;
        let insnVals = cpu.run1(cpu.pc);

        // If we are spinning in a loop waiting for RI, just introduce
        // a bit of delay if we keep seeing RI=0.
        if (cpu.mayDelay) break;

        if (maxCount && cpu.instructionsExecuted - startCount >= maxCount)
	  cpu.running = false;
      }

      if (cpu.tracing || !cpu.running) cpu.dumpState();

      skipBreakIfTrue = false;
    }

    if (cpu.running) {

      if (cpu.mayDelay) {
        cpu.mayDelay = false;
        setTimeout(runAsync, 100);
      } else {
        setImmediate(runAsync);
      }
    } else {

      if (!maxCount || stopReasons.code[cpu.pc]) {
	const stopTime = process.hrtime();
	const nSec = (stopTime[0] - startTime[0]) + (stopTime[1] - startTime[1]) / 1e9;
	cpu.executionTime += nSec;
	const nInstructions = cpu.instructionsExecuted - startOfLastStep;
	const ips =  nInstructions / cpu.executionTime;
	console.log(`[Executed ${nInstructions} instructions ` +
		    `or ${ips.toFixed(1)}/s]`);
	startOfLastStep = 0;	// Report full count next time if not in a step
      }

      startCLI();
    }
  }
}


const syms = {d: {}, c: {}, b: {}, n: {}, x: {}};


function setupSimulator() {
  const argv = process.argv.slice(1);

  function usageExit(msg) {
    console.error(`${msg}
Usage:
node ${argv[0]} hex-file-name lst-file-name`);
    process.exit(1);
  }

  if (argv.length < 2 || argv.length > 3) usageExit('[missing parameter]');

  const hexName = argv[1];
  const lstName = argv[2] || (hexName.split(/\./).slice(0, -1).join('.') + '.LST');
  let hex, sym;

  try {
    hex = fs.readFileSync(hexName, {encoding: 'utf-8'});
  } catch(e) {
    usageExit(`Unable to open ${e.path}: ${e.code}`);
  }

  try {
    sym = fs.existsSync(lstName) && fs.readFileSync(lstName, {encoding: 'utf-8'})
      .replace(/\r\n/g, '\n') // DOS to UNIX
      .replace(/\r/g, '\n');   // MACOS to UNIX
  } catch(e) {
    if (argv[2]) usageExit(`Unable to open ${e.path}: ${e.code}`);
  }

  const IntelHex = require('./intel-hex');
  const hexParsed = IntelHex.parse(hex, CODESize);
  const hexLength = hexParsed.highestAddress - hexParsed.lowestAddress;

  console.log(`Loaded ${toHex4(hexParsed.lowestAddress)}: ${hexLength.toString(16)} bytes`);
  hexParsed.data.copy(cpu.code, hexParsed.lowestAddress);

  if (sym) {
    // We capture the match result so we can slice off the LST file
    // prefix before the symbols section.
    let m;
    
    // /[A-Z_0-9]+( \.)*\s+[BCD]?\s+[A-Z]+\s+[0-9A-F]+H\s+[A-Z]\s*/
    if ((m = sym.match(/^N A M E      T Y P E   V A L U E       A T T R I B U T E S\n\n/m))) {
      // Type #1: "ACC . . . .  D ADDR    00E0H   A       "
      // D shown here can be B,C,D or missing.

      // Get to just symbol table portion and remove page headings
      sym = sym
        .slice(m.index + m[0].length)
        .replace(/\f.*\n+N A M E      T Y P E   V A L U E       A T T R I B U T E S\n\n/mg, '');

      sym
        .split(/\n/)
        .forEach(line => {
          const name = line.slice(0, 12).trim().replace(/[\.\s]+/, '');
          const addrSpace = line.slice(13, 14).trim().toLowerCase() || 'n';
          const type = line.slice(15, 22).trim();
          let addr = line.slice(23, 30).trim();
          let bit = undefined;

          switch (type) {
          case 'NUMB':
            addr = parseInt(addr, 16);
            break;

          case 'ADDR':

            if (addrSpace === 'B') {
              [addr, bit] = addr.split(/\./);
              bit = +bit;
            }

            addr = parseInt(addr.replace('H', ''), 16);
            break;

          case 'REG':
          default:
            return;
          }
          
          syms[addrSpace][name] = {name, addrSpace, type, addr, bit};
        });
    } else if ((m = sym.match(/SYMBOL\s+TYPE\s+VALUE\s+LINE\n-+\n/))) {
      // SYMBOL				  TYPE     VALUE	LINE
      // ------------------------------------------------------------
      // Type #2: "AABS         CODE      139C    4795"
      //
      // The last field is source line number in decimal and not
      // present for assembler-defined symbols like ACC.

      // Get to just symbol table portion and remove page headings
      sym = sym
        .slice(m.index + m[0].length)
        .replace(/\f\n.*\n+SYMBOL\s+TYPE\s+VALUE\s+LINE\n-+\n/g, '');

      sym
        .split(/\n/)
        .forEach(line => {
          const match = line.match(/(\w+)\s+(\w+)\s+([0-9A-F]+)(?:\s+(\d+)\s*)?/);

          if (!match) return;

          let [all, name, type, addr, lNum] = match;
          let addrSpace, bit;

          switch (type) {
          case 'CODE':
            addrSpace = 'c';
            break;

          case 'NUMBER':
          case 'DATA':
            addrSpace = 'd';
            break;

          case 'XDATA':
            addrSpace = 'x';
            break;

          case 'BIT':
            addrSpace = 'b';
            addr = parseInt(addr, 16);
            bit = addr & 7;
            break;

          default:
            addr = null;
            console.log(`Unrecognized .sym file content: "${line}"`);
            break;
          }
          
          if (addr !== null) {
            if (addrSpace !== 'b') addr = parseInt(addr, 16);
            syms[addrSpace][name] = {name, addrSpace, type, addr, bit};
          }
        });
    } else {
      console.log(`Unrecognized .sym file type: "${sym.slice(0, 100)}..."`);
    }
  }
}


// Only start the thing if we are not loaded via require.
if (require.main === module) {
  const ast = CODEGEN.init();
  opcodes = CODEGEN.generate(ast);

  setupSimulator();
  
  console.log('[Control-\\ will interrupt execution and return to prompt]');

  if (process.stdin.setRawMode)
    startCLI();
  else
    doGo(['go']);
} else {
  module.exports.opcodes = opcodes;
  module.exports.toHex2 = toHex2;
  module.exports.toHex4 = toHex4;
  module.exports.cpu = cpu;
}
