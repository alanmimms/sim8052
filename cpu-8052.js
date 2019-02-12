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
    this.code = code;
    this.xram = xram;
    this.iram = Buffer.alloc(0x100, 0x00, 'binary');

    this.ops = {
      // ANL
      [0x52]: opA_DIR(this, (a, b) => a & b),

      // ADD
      [0x24]: aluA_IMM(this, this.doADD, false),
      [0x25]: aluA_DIR(this, this.doADD, false),
      [0x26]: aluA_Ri(this, 0, this.doADD, false),
      [0x27]: aluA_Ri(this, 1, this.doADD, false),
      [0x28]: aluA_R(this, 0, this.doADD, false),
      [0x29]: aluA_R(this, 1, this.doADD, false),
      [0x2A]: aluA_R(this, 2, this.doADD, false),
      [0x2B]: aluA_R(this, 3, this.doADD, false),
      [0x2C]: aluA_R(this, 4, this.doADD, false),
      [0x2D]: aluA_R(this, 5, this.doADD, false),
      [0x2E]: aluA_R(this, 6, this.doADD, false),
      [0x2F]: aluA_R(this, 7, this.doADD, false),

      // ADDC
      [0x34]: aluA_IMM(this, this.doADD, true),
      [0x35]: aluA_DIR(this, this.doADD, true),
      [0x36]: aluA_Ri(this, 0, this.doADD, true),
      [0x37]: aluA_Ri(this, 1, this.doADD, true),
      [0x38]: aluA_R(this, 0, this.doADD, true),
      [0x39]: aluA_R(this, 1, this.doADD, true),
      [0x3A]: aluA_R(this, 2, this.doADD, true),
      [0x3B]: aluA_R(this, 3, this.doADD, true),
      [0x3C]: aluA_R(this, 4, this.doADD, true),
      [0x3D]: aluA_R(this, 5, this.doADD, true),
      [0x3E]: aluA_R(this, 6, this.doADD, true),
      [0x3F]: aluA_R(this, 7, this.doADD, true),
    };

    this.reset();
  };

  run1(pc = this.PC) {
    this.PC = pc;
    const op = this.code[pc];
    this.ops[op](this);
  };


  getR(r) { return this.iram[r + (this.RS1 << 4 | this.RS0 << 3)] }
  putR(r, v) { this.iram[r + (this.RS1 << 4 | this.RS0 << 3)] = v }


  // TODO: the getDIR and setDIR accessors need to switch on address
  // and access the appropriate SFRs member instance where needed.
  getDIR(ea) { return this.iram[ea] }

  setDIR(ea, v) {
    this.iram[ea] = v;
  };


  doADD(a, b, c) {
    const c6Value = +!!(((a & 0x7F) + (b & 0x7F) + c) & 0x80);
    const cyValue = +(a + b + c > 0xFF);
    const result = (a + b + c) & 0xFF;
    this.AC = +(((a & 0x0F) + (b & 0x0F) + c) > 0x0F);
    this.CY = cyValue;
    this.OV = cyValue ^ c6Value;
    return result;
  }


  doSUB(a, b, c) {
    const toSub = b + c;
    const result = (a - toSub) & 0xFF;
    this.CY = +(a < toSub);
    this.AC = +((a & 0x0F) < (toSub & 0x0F) || (c && ((b & 0x0F) == 0x0F)));
    this.OV = +((a < 0x80 && b > 0x7F && result > 0x7F) ||
                (a > 0x7F && b < 0x80 && result < 0x80));
    return result;
  }


  doMUL(a, b) {
    const result = a * b;
    this.CY = 0;                // Always clears CY.
    this.OV = +(result > 0xFF);
    this.B = a >>> 8;
    return result & 0xFF;
  }


  doDIV(a, b) {
    // DIV always clears CY. DIV sets OV on divide by 0.
    this.CY = 0;

    if (b === 0) {
      this.OV = 1;
    } else {
      const curA = a;
      a = Math.floor(curA / b);
      b = curA % b;
      this.B = b;
    }

    return a;
  }


  doRL(a) {
    a <<= 1;
    a = a & 0xFF | a >>> 8;
    return a;
  }


  doRLC(a) {
    let c = this.CY;
    this.CY = a >>> 7;
    a <<= 1;
    return a | c;
  }


  doRR(a) {
    a = a >>> 1 | a << 7;
    return a;
  }


  doRRC(a) {
    let c = this.CY;
    this.CY = a & 1;
    a >>>= 1;
    a |= c << 7;
    return a;
  }


  toSigned(v) {
    return v & 0x80 ? v - 0x100 : v;
  }


  reset() {
    this.PC = 0;
    this.sbufQ = [];
    this.ipl = -1;
    SFRs.forEach(sn => this[sn] = this[sn].resetValue);
  };
};
module.exports.CPU8052 = CPU8052;



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
