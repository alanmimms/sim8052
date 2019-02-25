// Definitions of MCS8052 CPU architecture.
'use strict';
const _ = require('lodash');
const util = require('util');

const {toHex1, toHex2, toHex4} = require('./simutils');


/*
  # Access examples

  cpu.ACC = 0x12;
  cpu.ACC += 0x42;
  cpu.B = cpu.ACC;

  cpu.OV = 1;
  cpu.CY |= c;
  v = cpu.PSW;

  cpu.PSW = 0x33;
*/


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

  constructor(addr, resetValue) {
    this.addr = addr;
    this.resetValue = resetValue || 0x00;
  }
};


// This class is for SFRs where the bits are kept separately as flags
// on the CPU8052 instance and aggregated together in the getter and
// disaggregated to the separate flags in the setter.
class BitFieldSFR extends SFR {

  constructor(addr, bitNames, cpu, resetValue) {
    super(addr, resetValue);
    this.cpu = cpu;
    this.bitNames = bitNames.toUpperCase();

    // Take the string and add get/set methods to treat each as a
    // single bit of the parent object's value. Define properties xBit
    // (bit address), xShift, and xMask for each bit `x`. The string
    // is a space separated list of bit names where the leftmost is
    // bit #n and rightmost is bit #0 and '.' is used for a reserved
    // bit.
    bitNames.split(/\s+/)
      .reverse()
      .map((name, index) => {

        if (name !== '.') {
          const mask = 1 << index;

          this[name + 'Shift'] = index;
          this[name + 'Mask'] = mask;
          this[name + 'Bit'] = addr + index;

          // Define zeroed flag on our parent object (CPU8052
          // instance) with uppercase version of this bit name.
          cpu[name.toUpperCase()] = 0;
        }
      });
  }

  // TODO: This needs to be define get/set for SFRs and BitFieldSFRs
  // to access SFR memory space in the CPU instance.

  get v() {
    const cpu = this.cpu;
    return this.bitNames.reduce((a, bit, x) => cpu[bit] << (7 - x), 0);
  }

  set v(a) {
    const cpu = this.cpu;
    this.bitNames.forEach((bit, x) => cpu[bit] = +!!(a & (1 << (7 - x))));
  }
};




const SFRs = {
  PSW: new BitFieldSFR(0xD0, 'cy ac f0 rs1 rs0 ov ud p', this),
  ACC: new SFR(0xE0),
  B: new SFR(0xF0),
  SP: new SFR(0x81, 0x07),
  DPL: new SFR(0x82),
  DPH: new SFR(0x83),
  P0: new SFR(0x80, null, 0xFF),
  P1: new SFR(0x90, null, 0xFF),
  P2: new SFR(0xA0, null, 0xFF),
  P3: new SFR(0xB0, null, 0xFF),
  IP: new BitFieldSFR(0xB8, '. . pt2 ps pt1 px1 pt0 px0', this),
  IE: new BitFieldSFR(0xA8, 'ea . et2 es et1 ex1 et0 ex0', this),
  TMOD: new SFR(0x89, 'gate1 ct1 t1m1 t1m0 gate0 ct0 t0m1 t0m0', this),
  TCON: new SFR(0x88, 'tf1 tr1 tf0 tr0 ie1 it1 ie0 it0', this),
  T2CON: new SFR(0xC8, 'tf2 exf2 rclk tclk exen2 tr2 ct2 cprl2', this),
  TH0: new SFR(0x8C),
  TL0: new SFR(0x8A),
  TH1: new SFR(0x8D),
  TL1: new SFR(0x8B),
  TH2: new SFR(0xCD),
  TL2: new SFR(0xCC),
  RCAP2H: new SFR(0xCB),
  RCAP2L: new SFR(0xCA),
  SCON: new BitFieldSFR(0x98, 'sm0 sm1 sm2 ren tb8 rb8 ti ri', this),
  SBUF: new SFR(0x99),
  PCON: new BitFieldSFR(0x87, 'smod . . . gf1 gf0 pd idl', this),
};
module.exports.SFRs = SFRs;



class CPU8052 {

  constructor(code, xram) {
    const C = this;

    C.code = code;
    C.xram = xram;
    C.iram = Buffer.alloc(0x100, 0x00, 'binary');

    C.ops = {
      // ANL
      [0x52]: opA_DIR(C, (a, b) => a & b),

      // ADD
      [0x24]: aluA_IMM(C, doADD, false),
      [0x25]: aluA_DIR(C, doADD, false),
      [0x26]: aluA_Ri(C, 0, doADD, false),
      [0x27]: aluA_Ri(C, 1, doADD, false),
      [0x28]: aluA_R(C, 0, doADD, false),
      [0x29]: aluA_R(C, 1, doADD, false),
      [0x2A]: aluA_R(C, 2, doADD, false),
      [0x2B]: aluA_R(C, 3, doADD, false),
      [0x2C]: aluA_R(C, 4, doADD, false),
      [0x2D]: aluA_R(C, 5, doADD, false),
      [0x2E]: aluA_R(C, 6, doADD, false),
      [0x2F]: aluA_R(C, 7, doADD, false),

      // ADDC
      [0x34]: aluA_IMM(C, doADD, true),
      [0x35]: aluA_DIR(C, doADD, true),
      [0x36]: aluA_Ri(C, 0, doADD, true),
      [0x37]: aluA_Ri(C, 1, doADD, true),
      [0x38]: aluA_R(C, 0, doADD, true),
      [0x39]: aluA_R(C, 1, doADD, true),
      [0x3A]: aluA_R(C, 2, doADD, true),
      [0x3B]: aluA_R(C, 3, doADD, true),
      [0x3C]: aluA_R(C, 4, doADD, true),
      [0x3D]: aluA_R(C, 5, doADD, true),
      [0x3E]: aluA_R(C, 6, doADD, true),
      [0x3F]: aluA_R(C, 7, doADD, true),

      // DA
      [0xD4]: doDA,
    };

    C.reset();


    function doDA() {
      C.PC += 1;

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


    function doRL(a) {
      a <<= 1;
      a = a & 0xFF | a >>> 8;
      return a;
    }


    function doRLC(a) {
      let c = C.CY;
      C.CY = a >>> 7;
      a <<= 1;
      return a | c;
    }


    function doRR(a) {
      a = a >>> 1 | a << 7;
      return a;
    }


    function doRRC(a) {
      let c = C.CY;
      C.CY = a & 1;
      a >>>= 1;
      a |= c << 7;
      return a;
    }


    function toSigned(v) {
      return v & 0x80 ? v - 0x100 : v;
    }


    function opA_DIR(C, op) {

      return function() {
        const ea = C.code[C.PC + 1];
        C.PC += 2;
        const b = C.getDIR(ea);
        const v = op(C.ACC, b);
        C.setDIR(ea, v);
      }
    }


    function aluA_DIR(C, op, useCY) {

      return function() {
        const ea = C.code[C.PC + 1];
        C.PC += 2;
        const b = C.getDIR(ea);
        const v = op(C.ACC, b, useCY ? C.CY : 0);
        C.ACC = v;
      }
    }


    function aluA_IMM(C, op, useCY) {

      return function() {
        const b = C.code[C.PC + 1];
        C.PC += 2;
        const v = op(C.ACC, b, useCY ? C.CY : 0);
        C.ACC = v;
      }
    }



    function aluA_R(C, r, op, useCY) {

      return function() {
        C.PC += 1;
        const b = C.getR(r);
        const v = op(C.ACC, b, useCY ? C.CY : 0);
        C.ACC = v;
      }
    }


    function aluA_Ri(C, r, op, useCY) {

      return function() {
        C.PC += 1;
        const b = C.iram[C.getR(r)];
        const v = op(C.ACC, b, useCY ? C.CY : 0);
        C.ACC = v;
      }
    }
  };


  run1(pc = C.PC) {
    this.PC = pc;
    const op = this.code[pc];
    this.ops[op](this);
  };


  getR(r) { return this.iram[r + (this.RS1 << 4 | this.RS0 << 3)] }
  putR(r, v) { this.iram[r + (this.RS1 << 4 | this.RS0 << 3)] = v }


  // TODO: this.the getDIR and setDIR accessors need to switch on address
  // and access the appropriate SFRs member instance where needed.
  getDIR(ea) { return this.iram[ea] }

  setDIR(ea, v) {
    this.iram[ea] = v;
  };


  reset() {
    this.PC = 0;
    this.sbufQ = [];
    this.ipl = -1;

    Object.keys(SFRs).forEach(sn => this[sn] = SFRs[sn].resetValue);
  };
};
module.exports.CPU8052 = CPU8052;



if (require.main === module) {

  // If this is run as main module, dump definition for our parity
  // table.
  const parityString = _.range(0, 0x100)
        .map(k => _.range(0, 8).reduce((p, bn) => p ^ ((k >>> bn) & 1), 0))
        .join(',')
        .replace(/(.{64})/g, '$1\n  ');

  console.log(`\
parity: [
  ${parityString}
],`);
}
