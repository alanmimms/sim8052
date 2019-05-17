#!/usr/bin/env -S node --no-deprecation
'use strict';

// TOOD: Move SFR emulation stuff into CPU class and make callbacks to
// get/put SIM related values.

// For `put` style functions, convention is put(address, value).
// For `get` convention is get(address).

// Make sure we do not use deprecated (and noisy) old new Buffer(n) API.
var Buffer = require('safe-buffer').Buffer;

const fs = require('fs');
const util = require('util');
const _ = require('lodash');
const readline = require('readline');
const {CPU8052} = require('./cpu-8052');

const {toHex1, toHex2, toHex4} = require('./simutils');


const debugBASIC2 = false;
const debugTB51 = true;


const insnsPerTick = 100;

const CODESize = 65536;
const XRAMSize = 65536;


// These are done first so we can construct a Proxy to access it.
const iram = Buffer.alloc(0x100, 0x00, 'binary');
const xram = Buffer.alloc(XRAMSize, 0x00, 'binary');
const SFR = Buffer.alloc(0x100, 0x00, 'binary');
const code = Buffer.alloc(CODESize, 0x00, 'binary');

// This CPU8052 instance we are simulating
var cpu;


// Indexed by opcode, a format string for our disassembly process.
const disOp = [
  "",                   // 00 NOP:1
  "1:addr11",           // 01 AJMP:2
  "1:addr16",           // 02 LJMP:3
  "A",                  // 03 RR:1
  "A",                  // 04 INC:1
  "1:direct",           // 05 INC:2
  "@Ri",                // 06 INC:1
  "@Ri",                // 07 INC:1
  "Ri",                 // 08 INC:1
  "Ri",                 // 09 INC:1
  "Ri",                 // 0A INC:1
  "Ri",                 // 0B INC:1
  "Ri",                 // 0C INC:1
  "Ri",                 // 0D INC:1
  "Ri",                 // 0E INC:1
  "Ri",                 // 0F INC:1
  "1:bit,2:rela",       // 10 JBC:3
  "1:addr11",           // 11 ACALL:2
  "1:addr16",           // 12 LCALL:3
  "A",                  // 13 RRC:1
  "A",                  // 14 DEC:1
  "1:direct",           // 15 DEC:2
  "@Ri",                // 16 DEC:1
  "@Ri",                // 17 DEC:1
  "Ri",                 // 18 DEC:1
  "Ri",                 // 19 DEC:1
  "Ri",                 // 1A DEC:1
  "Ri",                 // 1B DEC:1
  "Ri",                 // 1C DEC:1
  "Ri",                 // 1D DEC:1
  "Ri",                 // 1E DEC:1
  "Ri",                 // 1F DEC:1
  "1:bit,2:rela",       // 20 JB:3
  "1:addr11",           // 21 AJMP:2
  "",                   // 22 RET:1
  "A",                  // 23 RL:1
  "A,1:immed",          // 24 ADD:2
  "A,1:direct",         // 25 ADD:2
  "A,1:@Ri",            // 26 ADD:1
  "A,1:@Ri",            // 27 ADD:1
  "A,Ri",               // 28 ADD:1
  "A,Ri",               // 29 ADD:1
  "A,Ri",               // 2A ADD:1
  "A,Ri",               // 2B ADD:1
  "A,Ri",               // 2C ADD:1
  "A,Ri",               // 2D ADD:1
  "A,Ri",               // 2E ADD:1
  "A,Ri",               // 2F ADD:1
  "1:bit,2:rela",       // 30 JNB:3
  "1:addr11",           // 31 ACALL:2
  "",                   // 32 RETI:1
  "A",                  // 33 RLC:1
  "A,1:immed",          // 34 ADDC:2
  "A,1:direct",         // 35 ADDC:2
  "A,@Ri",              // 36 ADDC:1
  "A,@Ri",              // 37 ADDC:1
  "A,Ri",               // 38 ADDC:1
  "A,Ri",               // 39 ADDC:1
  "A,Ri",               // 3A ADDC:1
  "A,Ri",               // 3B ADDC:1
  "A,Ri",               // 3C ADDC:1
  "A,Ri",               // 3D ADDC:1
  "A,Ri",               // 3E ADDC:1
  "A,Ri",               // 3F ADDC:1
  "1:rela",             // 40 JC:2
  "1:addr11",           // 41 AJMP:2
  "A,1:direct",         // 42 ORL:2
  "1:direct,2:immed",   // 43 ORL:3
  "A,1:immed",          // 44 ORL:2
  "A,1:direct",         // 45 ORL:2
  "A,@Ri",              // 46 ORL:1
  "A,@Ri",              // 47 ORL:1
  "A,Ri",               // 48 ORL:1
  "A,Ri",               // 49 ORL:1
  "A,Ri",               // 4A ORL:1
  "A,Ri",               // 4B ORL:1
  "A,Ri",               // 4C ORL:1
  "A,Ri",               // 4D ORL:1
  "A,Ri",               // 4E ORL:1
  "A,Ri",               // 4F ORL:1
  "1:rela",             // 50 JNC:2
  "1:addr11",           // 51 ACALL:2
  "1:direct,A",         // 52 ANL:2
  "1:direct,2:immed",   // 53 ANL:3
  "A,1:immed",          // 54 ANL:2
  "A,1:direct",         // 55 ANL:2
  "A,@Ri",              // 56 ANL:1
  "A,@Ri",              // 57 ANL:1
  "A,Ri",               // 58 ANL:1
  "A,Ri",               // 59 ANL:1
  "A,Ri",               // 5A ANL:1
  "A,Ri",               // 5B ANL:1
  "A,Ri",               // 5C ANL:1
  "A,Ri",               // 5D ANL:1
  "A,Ri",               // 5E ANL:1
  "A,Ri",               // 5F ANL:1
  "1:rela",             // 60 JZ:2
  "1:addr11",           // 61 AJMP:2
  "1:direct,A",         // 62 XRL:2
  "1:direct,2:immed",   // 63 XRL:3
  "A,1:immed",          // 64 XRL:2
  "A,1:direct",         // 65 XRL:2
  "A,@Ri",              // 66 XRL:1
  "A,@Ri",              // 67 XRL:1
  "A,Ri",               // 68 XRL:1
  "A,Ri",               // 69 XRL:1
  "A,Ri",               // 6A XRL:1
  "A,Ri",               // 6B XRL:1
  "A,Ri",               // 6C XRL:1
  "A,Ri",               // 6D XRL:1
  "A,Ri",               // 6E XRL:1
  "A,Ri",               // 6F XRL:1
  "1:rela",             // 70 JNZ:2
  "1:addr11",           // 71 ACALL:2
  "C,1:bit",            // 72 ORL:2
  "@A+DPTR",            // 73 JMP:1
  "A,1:immed",          // 74 MOV:2
  "1:direct,2:immed",   // 75 MOV:3
  "@Ri,1:immed",        // 76 MOV:2
  "@Ri,1:immed",        // 77 MOV:2
  "Ri,1:immed",         // 78 MOV:2
  "Ri,1:immed",         // 79 MOV:2
  "Ri,1:immed",         // 7A MOV:2
  "Ri,1:immed",         // 7B MOV:2
  "Ri,1:immed",         // 7C MOV:2
  "Ri,1:immed",         // 7D MOV:2
  "Ri,1:immed",         // 7E MOV:2
  "Ri,1:immed",         // 7F MOV:2
  "1:rela",             // 80 SJMP:2
  "1:addr11",           // 81 AJMP:2
  "C,1:bit",            // 82 ANL:2
  "A,@A+PC",            // 83 MOVC:1
  "AB",                 // 84 DIV:1
  "2:direct,1:direct",  // 85 MOV:3
  "@Ri,1:direct",       // 86 MOV:2
  "@Ri,1:direct",       // 87 MOV:2
  "1:direct,Ri",        // 88 MOV:2
  "1:direct,Ri",        // 89 MOV:2
  "1:direct,Ri",        // 8A MOV:2
  "1:direct,Ri",        // 8B MOV:2
  "1:direct,Ri",        // 8C MOV:2
  "1:direct,Ri",        // 8D MOV:2
  "1:direct,Ri",        // 8E MOV:2
  "1:direct,Ri",        // 8F MOV:2
  "1:immed16",          // 90 MOV:3
  "1:addr11",           // 91 ACALL:2
  "1:bit,C",            // 92 MOV:2
  "A,@A+DPTR",          // 93 MOVC:1
  "A,1:immed",          // 94 SUBB:2
  "A,1:direct",         // 95 SUBB:2
  "A,@Ri",              // 96 SUBB:1
  "A,@Ri",              // 97 SUBB:1
  "A,Ri",               // 98 SUBB:1
  "A,Ri",               // 99 SUBB:1
  "A,Ri",               // 9A SUBB:1
  "A,Ri",               // 9B SUBB:1
  "A,Ri",               // 9C SUBB:1
  "A,Ri",               // 9D SUBB:1
  "A,Ri",               // 9E SUBB:1
  "A,Ri",               // 9F SUBB:1
  "C,1:nbit",           // A0 ORL:2
  "1:addr11",           // A1 AJMP:2
  "C,1:bit",            // A2 MOV:2
  "DPTR",               // A3 INC:1
  "AB",                 // A4 MUL:1
  "???",                // A5 UNKN:1
  "@Ri,1:direct",       // A6 MOV:2
  "@Ri,1:direct",       // A7 MOV:2
  "Ri,1:direct",        // A8 MOV:2
  "Ri,1:direct",        // A9 MOV:2
  "Ri,1:direct",        // AA MOV:2
  "Ri,1:direct",        // AB MOV:2
  "Ri,1:direct",        // AC MOV:2
  "Ri,1:direct",        // AD MOV:2
  "Ri,1:direct",        // AE MOV:2
  "Ri,1:direct",        // AF MOV:2
  "C,1:nbit",           // B0 ANL:2
  "1:addr11",           // B1 ACALL:2
  "1:bit",              // B2 CPL:2
  "C",                  // B3 CPL:1
  "A,1:immed,2:rela",   // B4 CJNE:3
  "A,1:dir,2:rela",     // B5 CJNE:3
  "@Ri,1:immed,2:rela", // B6 CJNE:3
  "@Ri,1:immed,2:rela", // B7 CJNE:3
  "Ri,1:immed,2:rela",  // B8 CJNE:3
  "Ri,1:immed,2:rela",  // B9 CJNE:3
  "Ri,1:immed,2:rela",  // BA CJNE:3
  "Ri,1:immed,2:rela",  // BB CJNE:3
  "Ri,1:immed,2:rela",  // BC CJNE:3
  "Ri,1:immed,2:rela",  // BD CJNE:3
  "Ri,1:immed,2:rela",  // BE CJNE:3
  "Ri,1:immed,2:rela",  // BF CJNE:3
  "1:direct",           // C0 PUSH:2
  "1:addr11",           // C1 AJMP:2
  "1:bit",              // C2 CLR:2
  "C",                  // C3 CLR:1
  "A",                  // C4 SWAP:1
  "A,1:direct",         // C5 XCH:2
  "A,@Ri",              // C6 XCH:1
  "A,@Ri",              // C7 XCH:1
  "A,Ri",               // C8 XCH:1
  "A,Ri",               // C9 XCH:1
  "A,Ri",               // CA XCH:1
  "A,Ri",               // CB XCH:1
  "A,Ri",               // CC XCH:1
  "A,Ri",               // CD XCH:1
  "A,Ri",               // CE XCH:1
  "A,Ri",               // CF XCH:1
  "1:direct",           // D0 POP:2
  "1:addr11",           // D1 ACALL:2
  "1:bit",              // D2 SETB:2
  "C",                  // D3 SETB:1
  "A",                  // D4 DA:1
  "1:direct,2:rela",    // D5 DJNZ:3
  "A,@Ri",              // D6 XCHD:1
  "A,@Ri",              // D7 XCHD:1
  "Ri,1:rela",          // D8 DJNZ:2
  "Ri,1:rela",          // D9 DJNZ:2
  "Ri,1:rela",          // DA DJNZ:2
  "Ri,1:rela",          // DB DJNZ:2
  "Ri,1:rela",          // DC DJNZ:2
  "Ri,1:rela",          // DD DJNZ:2
  "Ri,1:rela",          // DE DJNZ:2
  "Ri,1:rela",          // DF DJNZ:2
  "A,@DPTR",            // E0 MOVX:1
  "1:addr11",           // E1 AJMP:2
  "A,@Ri",              // E2 MOVX:1
  "A,@Ri",              // E3 MOVX:1
  "A",                  // E4 CLR:1
  "A,1:direct",         // E5 MOV:2
  "A,@Ri",              // E6 MOV:1
  "A,@Ri",              // E7 MOV:1
  "A,Ri",               // E8 MOV:1
  "A,Ri",               // E9 MOV:1
  "A,Ri",               // EA MOV:1
  "A,Ri",               // EB MOV:1
  "A,Ri",               // EC MOV:1
  "A,Ri",               // ED MOV:1
  "A,Ri",               // EE MOV:1
  "A,Ri",               // EF MOV:1
  "@DPTR,A",            // F0 MOVX:1
  "1:addr11",           // F1 ACALL:2
  "@Ri,A",              // F2 MOVX:1
  "@Ri,A",              // F3 MOVX:1
  "A",                  // F4 CPL:1
  "1:direct,A",         // F5 MOV:2
  "@Ri,A",              // F6 MOV:1
  "@Ri,A",              // F7 MOV:1
  "Ri,A",               // F8 MOV:1
  "Ri,A",               // F9 MOV:1
  "Ri,A",               // FA MOV:1
  "Ri,A",               // FB MOV:1
  "Ri,A",               // FC MOV:1
  "Ri,A",               // FD MOV:1
  "Ri,A",               // FE MOV:1
  "Ri,A",               // FF MOV:1
];



const sbufQueue = [];


const sim = {

  // Code (program) memory.
  code,

  // Internal RAM
  iram,

  // External (data) memory.
  xram,

  // Serial port input queue
  sbufQueue,

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


  // Direct accesses in 0x00..0x7F are internal RAM.
  // Above that, direct accesses are to SFRs.
  DIR: new Proxy(iram, {

    set(target, ea, value) {
      ea = +ea;                 // Proxy always gets `property` parameter as string

      if (ea < 0x80) {
        iram[ea] = value;
      } else {

        switch (ea) {
        case cpu.SBUF.addr:
          process.stdout.write(String.fromCharCode(value));

          // Transmitting a character immediately signals TI saying it is done.
          cpu.TI = 1;

          // TODO: Make this do an interrupt
          break;

        default:
          cpu.SFR[ea] = value;
          break;
        }
      }

      return true;
    },

    get(target, ea) {
      let v;

      ea = +ea;                 // Proxy always gets `property` parameter as string

      if (ea < 0x80) {
        return iram[ea];
      }        

      switch (ea) {
      case cpu.SBUF.addr:
        return sbufQueue.length ? sbufQueue.shift() : 0x00;

      case cpu.PSW.addr:
        // Update parity before returning PSW
        cpu.P = parityTable[cpu.ACC];
        return cpu.PSW;

      case cpu.P3.addr:
        cpu.P3 ^= 1;          // Fake RxD toggling
        return cpu.P3;

      case cpu.SCON.addr:
        return cpu.SCON.RI = +(sbufQueue.length !== 0);

      default:
        return cpu.SFR[ea];
      }
    }
  }),


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
      console.log(`-${toHex4(k+1)}: ${displayableAddress(this.fetchHistory[x], 'c')}`);
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
    const op = code[pc];
    const ope = cpu.ops[op];

    if (!ope || !ope.nBytes) {
      console.log(`Undefined opcodes[${toHex2(op)}] pc=${toHex4(pc)}`);
//      this.dumpFetchHistory();
    }

    const nextPC = pc + ope.nBytes;
    const bytes = code.slice(pc, nextPC);

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
      rela: x => displayableAddress(nextPC + toSigned(bytes[+x]), 'c'),
      Ri: () => 'R' + (op & 7).toString(),
      '@Ri': () => '@R' + (op & 1).toString(),
    };

    const opcodeHandlers = {Ri: 'Ri', '@Ri': '@Ri'};

    const operands = disOp[op].split(/,/)
          .map(opnd => {
            let [offset, handler] = opnd.split(/:/);
            handler = handler || opcodeHandlers[offset] || 'verbatum';
            return {handler, offset};
          })
          .map(x => handlers[x.handler](x.offset))
          .join(',');

    return `\
${(displayableAddress(pc, 'c') + ': ' + disassembly).padEnd(38)} \
${ope.mnemonic.padEnd(6)} ${operands}`;
  },


  dumpState() {
    console.log(`\
 a=${toHex2(cpu.ACC)}   b=${toHex2(cpu.B)}  cy=${+cpu.CY} ov=${+cpu.OV} ac=${cpu.AC}  \
sp=${toHex2(cpu.SP)} psw=${toHex2(cpu.PSW)}  dptr=${toHex4(cpu.DPTR)}  \
pc=${toHex4(cpu.PC)}
${_.range(0, 8)
  .map((v, rn) => `r${rn}=${toHex2(cpu.getR(rn))}`)
  .join('  ')
}`);
  },

  dumpCount: 50,


  captureState() {
    const rBase = cpu.RS1 << 4 | cpu.RS0 << 3;
    const state = {
      a: cpu.ACC,
      b: cpu.B,
      cy: cpu.CY,
      ov: cpu.OV,
      ac: cpu.AC,
      sp: cpu.SP,
      psw: cpu.PSW,
      dptr: cpu.DPTR,
      regs: [...iram.slice(rBase, rBase+8)],
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

    cpu.run1(this.pc);
    ++this.instructionsExecuted;
  },
};


function toSigned(v) {
  return v & 0x80 ? v - 0x100 : v;
}


// Return the address and bit mask for a given bit number.
function getBitAddrMask(bn) {
  const bm = 1 << (bn & 0x07);
  const ra = bn < 0x10 ? 0x20 + (bn >>> 3) : bn & 0xF8;
  return {ra, bm};
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
   doFn: words => doDumpMem(cpu.xram, cpu.xram.length, words),
  },

  {name: 'code',
   description: 'Display code memory at specified address.',
   doFn: words => doDumpMem(cpu.code, cpu.code.length, words),
  },

  {name: 'history',
   description: 'Display history of PC.',
   doFn: () => sim.dumpFetchHistory(),
  },

  {name: 'bhistory',
   description: 'Display history of branches.',
   doFn: () => sim.dumpBranchHistory(),
  },

  {name: 'sfr',
   description: 'Display SFR at specified address.',
   doFn: words => doDumpMem(cpu.SFR, cpu.SFR.length, words),
  },

  {name: 'iram',
   description: 'Display IRAM at specified address.',
   doFn: words => doDumpMem(cpu.iram, cpu.iram.length, words),
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
  return sim.disassemble(cpu.PC);
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
// sim.captureState().
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

  const toHex = (space === 'c' || space === 'x') ? toHex4 : toHex2;

  if (closestSym) {
    return closestSym.name + (closestOffset ? "+" + toHex(closestOffset) : "") +
      `=${toHex(x)}`;
  } else {
    return toHex(x) + 'H';
  }
}


function doDumpMem(memToDump, memSize, words) {
  let x, endAddress;
  let n = 0;

  if (words.length < 2) {
    x = ++lastX;
  } else {
    x = getAddress(words);

    if (words.length > 2) {
      endAddress = Math.min(x + parseInt(words[2], 16), memSize);
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
    line += ' ' + toHex2(memToDump[x++]);
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
    x = lastX + ope.n;
  } else {
    x = getAddress(words);
    if (words.length > 2) n = parseInt(words[1]);
  }

  for (; n; --n, ++x) console.log(`${sim.disassemble(x).padStart(40)}`);
  lastX = x;
}


function doDebug(words) {

  if (words.length === 1) {
    const maxWidth = sim.debugFlags
      .reduce((prev, cur) => cur.length > prev ? cur.length : prev, 0);
    console.log("\nCurrent debug flags and their values:\n");
    sim.debugFlags.forEach(f => {
      console.log(`  ${_.padStart(f, maxWidth)}: ${cpu[f]}`);
    });
    console.log("");
  } else {
    const flc = words[1].toLowerCase();
    let f = sim.debugFlags.find(f => f.toLowerCase() === flc);

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
  sim.dumpState();
}


function doGo(words) {
  const b = words.length >= 2 ? getAddress(words) : cpu.PC;

  if (b !== cpu.PC) {
    sim.saveBranchHistory(cpu.PC, b, 'go');
    cpu.PC = b;
  }

  startOfLastStep = sim.instructionsExecuted;
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
    startOfLastStep = sim.instructionsExecuted;
    run(cpu.PC);
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
  startOfLastStep = sim.instructionsExecuted;
  run(cpu.PC, n);
}


const stepOverRange = 0x10;

function doOver(words) {
  _.range(1, stepOverRange)
    .forEach(offs => stopReasons.code[cpu.PC + offs] = ({
      msg: `stepped over to $+${toHex2(offs)}H`,
      transient: true,
    }));

  startOfLastStep = sim.instructionsExecuted;
  run(cpu.PC);
}


function doQuit(words) {
  if (rl) rl.close();
  console.log("[Exiting]");
  process.exit(0);
}


function doStats(words) {
  console.log(`Instructions executed: ${sim.instructionsExecuted}`);
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
  if (words.length < 2) return cpu.PC;

  switch (words[1]) {
  case 'pc':
    return cpu.PC;

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
    sim.running = false;
    startCLI();
  });

  rl.question(`${curInstruction()} > `, handleLine);
}


function sbufRx(c) {

  // Ignore characters if receiver is not enabled
  if ((cpu.REN) === 0) return;

  sim.sbufQueue.push(c);

  // TODO: Make this do RI interrupt
}


function sbufKeypressHandler(ch, key) {

  if (ch != null) {
    let c = ch.charCodeAt(0);

    // Stop with C-\ keypress
    if (c === 0x1c) {
      sim.running = false;
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
  const startCount = sim.instructionsExecuted;
  const startTime = process.hrtime();

  cpu.PC = pc;
  sim.running = true;

  let skipBreakIfTrue = true;

  stopCLI();
  setImmediate(runAsync);

  function runAsync() {

    for (let n = insnsPerTick; sim.running && n; --n) {

      if (!skipBreakIfTrue && stopReasons.code[cpu.PC]) {
	console.log(`[${stopReasons.code[cpu.PC].msg}]`); // Say why we stopped
        sim.running = false;

        const match = stopReasons.code[cpu.PC].msg
              .match(/^stepped over to \$\+([0-9A-F]+)H/);

        // If we stepped over to, say, "stepped over to $+5" then we
        // have to delete breakpoints before this point as well.
        if (match) {
          const atOffset = parseInt(match[1], 16);
          _.range(-atOffset, stepOverRange-atOffset)
            .forEach(offs => delete stopReasons.code[cpu.PC+offs]);
        } else {
          if (stopReasons.code[cpu.PC].transient) delete stopReasons.code[cpu.PC];
        }
      } else {
        sim.run1(cpu.PC);

        // If we are spinning in a loop waiting for RI, just introduce
        // a bit of delay if we keep seeing RI=0.
        if (sim.mayDelay) break;

        if (maxCount && sim.instructionsExecuted - startCount >= maxCount)
	  sim.running = false;
      }

      if (sim.tracing || !sim.running) sim.dumpState();

      skipBreakIfTrue = false;
    }

    if (sim.running) {

      if (sim.mayDelay) {
        sim.mayDelay = false;
        setTimeout(runAsync, 100);
      } else {
        setImmediate(runAsync);
      }
    } else {

      if (!maxCount || stopReasons.code[cpu.PC]) {
	const stopTime = process.hrtime();
	const nSec = (stopTime[0] - startTime[0]) + (stopTime[1] - startTime[1]) / 1e9;
	sim.executionTime += nSec;
	const nInstructions = sim.instructionsExecuted - startOfLastStep;
	const ips =  nInstructions / sim.executionTime;
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
  hexParsed.data.copy(code, hexParsed.lowestAddress);

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
  setupSimulator();
  cpu = new CPU8052(code, xram);

  console.log('[Control-\\ will interrupt execution and return to prompt]');

  if (process.stdin.setRawMode)
    startCLI();
  else
    doGo(['go']);
} else {
  module.exports.toHex2 = toHex2;
  module.exports.toHex4 = toHex4;
  module.exports.cpu = cpu;
}
