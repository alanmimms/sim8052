// Definitions of MCS8052 CPU architecture.
'use strict';
const _ = require('lodash');
const util = require('util');

const {toHex1, toHex2, toHex4} = require('./simutils');


// SFR values are stored as property values on the CPU8052 object.
// BitFieldSFR values have their bit flag values stored as property
// values on the CPU8052 object. Accesses to read SFR by address
// retrieve the appropriate property for SFRs and aggregate the bit
// flag values for BitFieldSFR values before returning the value for a
// get. A set changes the value of the property on the CPU8052 object
// for an SFR and disaggregates the bit flag values for a BitFieldSFR.


//  mathMask: pswBits.ovMask | pswBits.acMask | pswBits.cyMask,
//  rsMask: pswBits.rs0Mask | pswBits.rs1Mask,

const parityTable = [
  0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
  1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
  1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
  0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
  1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
  0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
  0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
  1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
];


class SFR {

  constructor(name, addr, cpu, resetValue, defineProps) {
    this.name = name;
    this.addr = addr;
    this.cpu = cpu;
    this.resetValue = resetValue || 0x00;
    this.defineGetSet(cpu, name);
  }


  defineGetSet(cpu, name) {

    Object.defineProperty(cpu, name, {

      get: function() {
        const v = cpu.SFR[name];
        return v;
      },

      set: function(v) {
        cpu.SFR[name] = v;
      },
    });
  }
};


// This class is for SFRs where the bits are kept separately as flags
// on the CPU8052 instance and aggregated together in the getter and
// disaggregated to the separate flags in the setter.
class BitFieldSFR extends SFR {

  constructor(name, addr, bitNames, cpu, resetValue) {

    super(name, addr, cpu, resetValue);

    // Take the string and add get/set methods to treat each as a
    // single bit of the parent object value. Define properties xBit
    // (bit address), xShift, and xMask for each bit `x`. The string
    // is a space separated list of bit names where the leftmost is
    // bit #n and rightmost is bit #0 and '.' is used for a reserved
    // bit.
    bitNames.split(/\s+/)
      .reverse()
      .map((name, index) => {
        const ucName = name.toUpperCase();

        if (name !== '.') {
          const mask = 1 << index;

          this[name + 'Shift'] = index;
          this[name + 'Mask'] = mask;
          this[name + 'Bit'] = addr + index;

          // Define zeroed flag on our parent object (CPU8052
          // instance) with uppercase version of this bit name.
          cpu[name.ucName] = 0;
        }
      });

    this.bitNames = bitNames.toUpperCase().split(/\s+/);
  }


   defineGetSet(cpu, name) {
    const sfr = this;

    Object.defineProperty(cpu, name, {

      get: function() {
        return sfr.bitNames.reduce((a, bit, x) => cpu[bit] << (7 - x), 0);
      },

      set: function(v) {
        sfr.bitNames.forEach((bit, x) => cpu[bit] = +!!(v & (1 << (7 - x))));
      },
    });
  }
};


class CPU8052 {

  constructor(code, xram) {
    const C = this;

    C.code = code || Buffer.alloc(0x10000, 0x00, 'binary');
    C.xram = xram || Buffer.alloc(0x10000, 0x00, 'binary');
    C.iram = Buffer.alloc(0x100, 0x00, 'binary');
    C.SFR = {};

    C.SFRs = {
      PSW: new BitFieldSFR('PSW', 0xD0, 'cy ac f0 rs1 rs0 ov ud p', this),
      ACC: new SFR('ACC', 0xE0, this),
      B: new SFR('B', 0xF0, this),
      SP: new SFR('SP', 0x81, this, 0x07),
      DPL: new SFR('DPL', 0x82, this),
      DPH: new SFR('DPH', 0x83, this),
      P0: new SFR('P0', 0x80, this, null, 0xFF),
      P1: new SFR('P1', 0x90, this, null, 0xFF),
      P2: new SFR('P2', 0xA0, this, null, 0xFF),
      P3: new SFR('P3', 0xB0, this, null, 0xFF),
      IP: new BitFieldSFR('IP', 0xB8, '. . pt2 ps pt1 px1 pt0 px0', this),
      IE: new BitFieldSFR('IE', 0xA8, 'ea . et2 es et1 ex1 et0 ex0', this),
      TMOD: new BitFieldSFR('TMOD', 0x89, 'gate1 ct1 t1m1 t1m0 gate0 ct0 t0m1 t0m0', this),
      TCON: new BitFieldSFR('TCON', 0x88, 'tf1 tr1 tf0 tr0 ie1 it1 ie0 it0', this),
      T2CON: new BitFieldSFR('T2CON', 0xC8, 'tf2 exf2 rclk tclk exen2 tr2 ct2 cprl2', this),
      TH0: new SFR('TH0', 0x8C, this),
      TL0: new SFR('TL0', 0x8A, this),
      TH1: new SFR('TH1', 0x8D, this),
      TL1: new SFR('TL1', 0x8B, this),
      TH2: new SFR('TH2', 0xCD, this),
      TL2: new SFR('TL2', 0xCC, this),
      RCAP2H: new SFR('RCAP2H', 0xCB, this),
      RCAP2L: new SFR('RCAP2L', 0xCA, this),
      SCON: new BitFieldSFR('SCON', 0x98, 'sm0 sm1 sm2 ren tb8 rb8 ti ri', this),
      SBUF: new SFR('SBUF', 0x99, this),
      PCON: new BitFieldSFR('PCON', 0x87, 'smod . . . gf1 gf0 pd idl', this),
    };


    C.ops = [];
    C.reset();
    C.ipl = -1;

    const getA = () => C.ACC;
    const getDIR = () => C.getDIR(C.code[(C.opPC + 1) & 0xFFFF]);
    const getIMM = () => C.code[(C.opPC + 1) & 0xFFFF];
    const getBIT = () => C.getBIT(C.code[(C.opPC + 1) & 0xFFFF]);
    const getIMM2 = () => C.code[(C.opPC + 2) & 0xFFFF];
    const getR = () => C.getR(C.op & 0x07);
    const getRi = () => C.iram[C.getR(C.op & 0x01)];
    const getCY = () => C.CY;

    const putA = v => C.ACC = v;
    const putDIR = v => C.setDIR(C.code[(C.opPC + 1) & 0xFFFFF], v);
    const putR = v => C.setR(C.op & 0x7, v);
    const putRi = v => C.iram(C.getR(C.op & 0x1), v);
    const putCY = v => C.CY = v;

    function genSimple(mnemonic, op, nBytes, f) {

      return C.ops[op] = {
        mnemonic,

        f: C => {
          C.PC = (C.PC + nBytes) & 0xFFFF;
          f(C);
        },
      };
    }

    function genOp(mnemonic, op, nBytes, putResult, getA, getB, opF) {
      C.ops[op] = {mnemonic, f: function(C) {
        C.PC = (C.PC + nBytes) & 0xFFFF;
        const a = getA();
        const b = getB();
        const r = opF(a, b, C.CY);
        putResult(r);
      }};
    }


    function genLogical(mnemonic, {op, opF,
                                  bitOp, bitF,
                                  notBitOp, notBitF}) {
      genOp(mnemonic, op+0x02, 2, putDIR, getDIR, getA, opF);
      genOp(mnemonic, op+0x03, 3, putDIR, getDIR, getIMM2, opF);
      genOp(mnemonic, op+0x04, 2, putA, getA, getIMM, opF);
      genOp(mnemonic, op+0x05, 2, putA, getA, getDIR, opF);

      // @Ri
      _.times(2, r => genOp(mnemonic, op + 0x06 + r, 1, putA, getA, getRi, opF));

      // Rn
      _.times(8, r => genOp(mnemonic, op + 0x08 + r, 1, putA, getA, getR, opF));

      if (bitF && notBitF) {
        genOp(mnemonic, bitOp, 2, putCY, getCY, getBIT, bitF);
        genOp(mnemonic, notBitOp, 2, putCY, getCY, getBIT, notBitF);
      }
    }


    function genMath(mnemonic, op, opF, withCarry) {
      // Bind our operator function to one that gets CY if carry is
      // requested, else use zero.
      const fullOpF = withCarry ? 
            ((a, b) => opF(a, b, getCY())) :
            ((a, b) => opF(a, b, 0));

      genOp(mnemonic, op+0x04, 2, putA, getA, getIMM, fullOpF);
      genOp(mnemonic, op+0x05, 2, putA, getA, getDIR, fullOpF);

      // @Ri
      _.times(2, r => genOp(mnemonic, op+0x06+r, 1, putA, getA, getRi, fullOpF));

      // Rn
      _.times(8, r => genOp(mnemonic, op+0x08+r, 1, putA, getA, getR, fullOpF));
    }


    function genBitUnary(mnemonic, {op, opF, 
                                   accOp, accOpF}) {
      // FIXME switch to genOp style
      Object.assign(C.ops, {
        [op + 0x02]: bitBIT(C, opF),
        [op + 0x03]: bitCY(C, opF),
      });

      if (accOpF) {
        Object.assign(C.ops, {
          [accOp]: singleton(C, accOpF),
        });
      }
    }


    const ANL = (a, b) => a & b;
    const ANL_NOT = (a, b) => a & +!b;
    genLogical('ANL', {op: 0x50, opF: ANL,
                       bitOp: 0x82, bitF: ANL,
                       notBitOp: 0xB0, notBitF: ANL_NOT});

    const ORL = (a, b) => a | b;
    const ORL_NOT = (a, b) => a | +!b;
    genLogical('ORL', {op: 0x40, opF: ORL,
                       bitOp: 0x72, bitF: ORL,
                       notBitOp: 0xA0, notBitF: ORL_NOT});

    genLogical('XRL', {op: 0x60, opF: (a, b) => a ^ b});

    genBitUnary('CLR', {op: 0xC0, opF: () => 0, accOp: 0xE4, accOpF: C => C.ACC = 0});
    genBitUnary('CPL', {op: 0xB0, opF: b => +!b, accOp: 0xF4, accOpF: C => C.ACC ^= 0xFF});
    genBitUnary('SETB', {op: 0xD0, opF: b => 1});

    genMath('ADD', 0x20, doADD, false);
    genMath('ADDC', 0x30, doADD, true);
    genMath('SUBB', 0x90, doSUB, true);

    genSimple('DA', 0xDA, 1, doDA);
    genSimple('XCHD', 0xD6, 1, genXCHD(0));
    genSimple('XCHD', 0xD7, 1, genXCHD(1));

    _.range(8).forEach(genAJMP);
    _.range(8).forEach(genACALL);
    genSimple('RET', 0x22, 1, doRET);
    genSimple('RETI', 0x32, 1, doRETI);
    genSimple('LCALL', 0x12, 3, doLCALL);
    genSimple('RL', 0x23, 1, doRL);
    genSimple('RLC', 0x33, 1, doRLC);
    genSimple('RR', 0x03, 1, doRR);
    genSimple('RRC', 0x13, 1, doRRC);
    genSimple('SJMP', 0x80, 2, doSJMP);


    console.warn(`Remaining undefined opcodes:
${(() => {const list = _.range(0x100)
.filter(op => C.ops[op])
.map(op => toHex2(op));
   return list.join(' ') + `
${0x100 - list.length} ops missing`;})()}`);



    function doSJMP(C) {
      const rel = C.code[(C.opPC + 1) & 0xFFFF];
      C.PC = (C.PC + toSigned(rel)) & 0xFFFF;
    }


    function genAJMP(p) {

      // Note nBytes=0 here since this is a JMP instruction
      genSimple('AJMP', p << 5 | 0x01, 0, C => {
        const lo = C.code[(C.opPC + 1) & 0xFFFF];
        C.PC = ((C.PC + 2) & 0xF800) | (p << 8) | lo;
      });
    }


    function genACALL(p) {

      // Note nBytes=0 here since this is a JMP instruction
      genSimple('ACALL', p << 5 | 0x11, 0, C => {
        const lo = C.code[(C.opPC + 1) & 0xFFFF];
        let pc = (C.PC + 2) & 0xFFFF;
        C.push16(pc);
        C.PC = (pc & 0xF800) | p << 8 | lo;
      });
    }


    function doLCALL(C) {
      const hi = C.code[(C.opPC + 1) & 0xFFFF];
      const lo = C.code[(C.opPC + 2) & 0xFFFF];
      C.push16(C.PC);
      C.PC = hi << 8 | lo;
    }
    

    function genXCHD(r) {

      return function(C) {
        const a = C.ACC;
        const b = C.iram[C.getR(r)];
        C.PC = (C.PC + 1) & 0xFFFF;
        C.ACC &= 0xF0;
        C.ACC |= b & 0x0F;
        C.iram[C.getR(r)] &= 0xF0;
        C.iram[C.getR(r)] |= a & 0x0F;
      };
    }


    function doRET(C) {
      let sp = C.SP;
      const pcH = C.iram[sp];
      sp = (sp - 1) & 0xFF;
      const pcL = C.iram[sp];
      sp = (sp - 1) & 0xFF;
      C.SP = sp;
      C.PC = pcH << 8 | pcL;
    }


    function doRETI(C) {
      if (C.ipl >= 0) C.ipl = C.ipl - 1;
      doRET(C);
    }


    function doDA() {
      C.PC = (C.PC + 1) & 0xFFFF;

      if ((C.ACC & 0x0F) > 9 || C.AC) {
        if (C.ACC + 0x06 > 0xFF) C.CY = 1
        C.ACC = (C.ACC + 0x06) & 0xFF;
      }
      
      if ((C.ACC & 0xF0) > 0x90 || C.CY) {
        if (C.ACC + 0x60 > 0xFF) C.CY = 1;
        C.ACC = (C.ACC + 0x60) & 0xFF;
      }
    }


    function doADD(a, b, c) {
      const c6Value = +!!(((a & 0x7F) + (b & 0x7F) + c) & 0x80);
      const cyValue = +(a + b + c > 0xFF);
      const result = (a + b + c) & 0xFF;
      C.AC = +(((a & 0x0F) + (b & 0x0F) + c) > 0x0F);
      C.CY = cyValue;
      C.OV = cyValue ^ c6Value;
      return result;
    }


    function doSUB(a, b, c) {
      const toSub = b + c;
      const result = (a - toSub) & 0xFF;
      C.CY = +(a < toSub);
      C.AC = +((a & 0x0F) < (toSub & 0x0F) || (c && ((b & 0x0F) == 0x0F)));
      C.OV = +((a < 0x80 && b > 0x7F && result > 0x7F) ||
               (a > 0x7F && b < 0x80 && result < 0x80));
      return result;
    }


    function doMUL(a, b) {
      const result = a * b;
      C.CY = 0;                // Always clears CY.
      C.OV = +(result > 0xFF);
      C.B = a >>> 8;
      return result & 0xFF;
    }


    function doDIV(a, b) {
      // DIV always clears CY. DIV sets OV on divide by 0.
      C.CY = 0;

      if (b === 0) {
        C.OV = 1;
      } else {
        const curA = a;
        a = Math.floor(curA / b);
        b = curA % b;
        C.B = b;
      }

      return a;
    }


    function doRL(C) {
      let a = C.ACC;
      a <<= 1;
      a = a & 0xFF | a >>> 8;
      C.ACC = a & 0xFF;
    }


    function doRLC(C) {
      let a = C.ACC;
      let c = C.CY;
      C.CY = a >>> 7;
      a <<= 1;
      C.ACC = (a & 0xFF) | c;
    }


    function doRR(C) {
      let a = C.ACC;
      a = a >>> 1 | a << 7;
      C.ACC = a & 0xFF;
    }


    function doRRC(C) {
      let a = C.ACC;
      let c = C.CY;
      C.CY = a & 1;
      a >>>= 1;
      a |= c << 7;
      C.ACC = a & 0xFF;
    }


    function toSigned(v) {
      return v & 0x80 ? v - 0x100 : v;
    }


    function opCY_bit(C, op) {

      return function() {
        const bn = C.code[(C.PC + 1) & 0xFFFF];
        C.PC = (C.PC + 2) & 0xFFFF;
        const b = C.getBIT(bn);
        C.CY = +op(C.CY, b);
      }
    }


    function singleton(C, op) {

      return function() {
        C.PC = (C.PC + 1) & 0xFFFF;
        op(C);
      }
    }


    function bitBIT(C, op) {

      return function() {
        const bit = C.code[(C.PC + 1) & 0xFFFF];
        C.PC = (C.PC + 2) & 0xFFFF;
        const b = C.getBIT(bit);
        const v = op(b);
        C.setBIT(bit, v);
      }
    }


    function bitCY(C, op) {

      return function() {
        C.PC = (C.PC + 1) & 0xFFFF;
        const b = C.CY;
        const v = op(b);
        C.CY = v;
      }
    }


    function opA_DIR(C, op) {

      return function() {
        const ea = C.code[(C.PC + 1) & 0xFFFF];
        C.PC = (C.PC + 2) & 0xFFFF;
        const b = C.getDIR(ea);
        const v = op(C.ACC, b);
        C.ACC = v;
      }
    }


    function opDIR_A(C, op) {

      return function() {
        const dir = C.code[(C.PC + 1) & 0xFFFF];
        C.PC = (C.PC + 2) & 0xFFFF;
        const a = C.getDIR(dir);
        const v = op(a, C.ACC);
        C.setDIR(dir, v);
      }
    }


    function opDIR_IMM(C, op) {

      return function() {
        const dir = C.code[(C.PC + 1) & 0xFFFF];
        const imm = C.code[(C.PC + 2) & 0xFFFF];
        C.PC = (C.PC + 3) & 0xFFFF;
        const a = C.getDIR(dir);
        const v = op(a, imm);
        C.setDIR(dir, v);
      }
    }


    function aluA_DIR(C, op, useCY) {

      return function() {
        const ea = C.code[(C.PC + 1) & 0xFFFF];
        C.PC = (C.PC + 2) & 0xFFFF;
        const b = C.getDIR(ea);
        const v = op(C.ACC, b, useCY ? C.CY : 0);
        C.ACC = v;
      }
    }


    function aluA_IMM(C, op, useCY) {

      return function() {
        const b = C.code[(C.PC + 1) & 0xFFFF];
        C.PC = (C.PC + 2) & 0xFFFF;
        const v = op(C.ACC, b, useCY ? C.CY : 0);
        C.ACC = v;
      }
    }



    function aluA_R(C, r, op, useCY) {

      return function() {
        C.PC = (C.PC + 1) & 0xFFFF;
        const b = C.getR(r);
        const v = op(C.ACC, b, useCY ? C.CY : 0);
        C.ACC = v;
      }
    }


    function aluA_Ri(C, r, op, useCY) {

      return function() {
        C.PC = (C.PC + 1) & 0xFFFF;
        const b = C.iram[C.getR(r)];
        const v = op(C.ACC, b, useCY ? C.CY : 0);
        C.ACC = v;
      }
    }
  };


  push8(v) {
    const C = this;
    let sp = C.SP;

    sp = (sp + 1) & 0xFF;
    C.iram[sp] = v;

    C.SP = sp;
  };
  

  push16(v) {
    const C = this;
    let sp = C.SP;

    sp = (sp + 1) & 0xFF;
    C.iram[sp] = v;

    sp = (sp + 1) & 0xFF;
    C.iram[sp] = v >>> 8;

    C.SP = sp;
  };
  

  run1(pc = this.PC) {
    const C = this;
    C.opPC = C.PC = pc;
    C.op = C.code[pc];
    C.ops[C.op].f(C);
  };


  getR(r) { return this.iram[r + (this.RS1 << 4 | this.RS0 << 3)] }
  putR(r, v) { this.iram[r + (this.RS1 << 4 | this.RS0 << 3)] = v }


  // TODO: this.the getDIR and setDIR accessors need to switch on address
  // and access the appropriate SFRs member instance where needed.
  getDIR(ea) { return this.iram[ea] }

  setDIR(ea, v) {
    this.iram[ea] = v;
  };


  // TODO: this.the getBIT and setBIT accessors need to switch on address
  // and access the appropriate SFRs member instance where needed.
  getBIT(bn) {
    bn = +bn;
    const mask = 1 << (bn & 7);

    if (bn < 0x80) {
      const ea = 0x20 + (bn >>> 3);
      return +!!(this.iram[ea] & mask);
    } else {
      const ea = bn & 0xF8;
      return +!!(this.SFR[ea] & mask);
    }
  }

  setBIT(bn, v) {
    bn = +bn;
    const mask = 1 << (bn & 7);

    if (bn < 0x80) {
      const ea = 0x20 + (bn >>> 3);

      if (v) {
        this.iram[ea] |= mask;
      } else {
        this.iram[ea] &= ~mask;
      }
    } else {
      const ea = bn & 0xF8;

      if (v) {
        this.SFR[ea] |= mask;
      } else {
        this.SFR[ea] &= ~mask;
      }
    }
  }


  reset() {
    this.PC = 0;
    this.sbufQ = [];
    this.ipl = -1;

    Object.keys(this.SFRs).forEach(sn => this[sn] = this.SFRs[sn].resetValue);
  };
};
module.exports.CPU8052 = CPU8052;



if (require.main === module) {

  // If this is run as main module, dump definition for our parity
  // table.
  const parityString = _.range(0x100)
        .map(k => _.range(8).reduce((p, bn) => p ^ ((k >>> bn) & 1), 0))
        .join(',')
        .replace(/(.{64})/g, '$1\n  ');

  console.log(`\
parity: [
  ${parityString}
],`);
}
