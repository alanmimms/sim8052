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

const DIRtoSFR = [];
module.exports.DIRtoSFR = DIRtoSFR;

class SFR {

  // This uses the class property `options` to define wrappers for
  // getters and setters for the SFR values so the simulator can
  // simulated connected peripherals and passing time and such.
  constructor(name, addr, cpu, resetValue) {
    this.name = name;
    this.addr = +addr;
    this.cpu = cpu;
    this.resetValue = resetValue || 0x00;
    DIRtoSFR[addr] = name;
    this.defineGetSet(cpu, name, SFR.options[name] || {});
  }


  defineGetSet(cpu, name, options) {
    const sfr = this;

    Object.defineProperty(cpu, name, {

      get: function() {
        const v = cpu.SFRvalue[name];
        return options.get ? options.get.call(sfr, v) : v;
      },

      set: function(v) {
        v = options.set ? options.set.call(sfr, v) : v;
        cpu.SFRvalue[name] = v & 0xFF;
      },
    });
  }
};

module.exports.SFR = SFR;


// This class is for SFRs where the bits are kept separately as flags
// on the CPU8052 instance and aggregated together in the getter and
// disaggregated to the separate flags in the setter.
class BitFieldSFR extends SFR {

  constructor(name, addr, bitNames, cpu, affectsInt, resetValue) {

    super(name, addr, cpu, resetValue);

    // Take the string and add get/set methods to treat each as a
    // single bit of the parent object value. Define properties xBit
    // (bit address), xShift, and xMask for each bit `x`. The string
    // is a space separated list of bit names where the leftmost is
    // bit #n and rightmost is bit #0 and '.' is used for a reserved
    // bit.
    bitNames.split(/\s+/)
      .reverse()                // First bit is leftmost
      .map((name, index) => {
        const ucName = name.toUpperCase();

        if (name !== '.') {
          const mask = 1 << index;

          cpu[name + 'Shift'] = index;
          cpu[name + 'Mask'] = mask;
          cpu[name + 'Bit'] = addr + index;

          // Define zeroed flag on our parent object (CPU8052
          // instance) with uppercase version of this bit name.
          cpu[name.ucName] = 0;
        }
      });

    this.affectsInt = affectsInt;
    this.bitNames = bitNames.toUpperCase().split(/\s+/).reverse();
  }


  defineGetSet(cpu, name, options) {
    const sfr = this;

    Object.defineProperty(cpu, name, {

      get: function() {
        const v = sfr.bitNames.reduce((a, bit, x) => a | cpu[bit] << x, 0);
        return options.get ? options.get.call(sfr, v) : v;
      },

      set: function(v) {
        if (sfr.affectsInt) cpu.intChange = true;
        v = options.set ? options.set.call(sfr, v) : v;
        sfr.bitNames.forEach((bit, x) => cpu[bit] = +!!(v & (1 << x)));
      },
    });
  }
};


class CPU8052 {

  constructor(code, xram, sfrOptions = {}) {
    const C = this;

    C.code = code || Buffer.alloc(0x10000, 0x00, 'binary');
    C.xram = xram || Buffer.alloc(0x10000, 0x00, 'binary');
    C.iram = Buffer.alloc(0x100, 0x00, 'binary');
    C.SFRvalue = {};

    SFR.options = sfrOptions;

    // Set this flag whenever interrupt conditions change in any way.
    // This triggers the interrupt dispatching code to walk through
    // the sources, figure out priorities, and trigger an interrupt
    // cycle if it is warranted.
    C.intChange = false;
    
    C.SFRs = {
      PSW: new BitFieldSFR('PSW', 0xD0, 'cy ac f0 rs1 rs0 ov ud p', C),
      ACC: new SFR('ACC', 0xE0, C),
      B: new SFR('B', 0xF0, C),
      SP: new SFR('SP', 0x81, C, 0x07),
      DPL: new SFR('DPL', 0x82, C),
      DPH: new SFR('DPH', 0x83, C),
      P0: new SFR('P0', 0x80, C, null, 0xFF),
      P1: new SFR('P1', 0x90, C, null, 0xFF),
      P2: new SFR('P2', 0xA0, C, null, 0xFF),
      P3: new SFR('P3', 0xB0, C, null, 0xFF),
      IP: new BitFieldSFR('IP', 0xB8, '. . pt2 ps pt1 px1 pt0 px0', C, true),
      IE: new BitFieldSFR('IE', 0xA8, 'ea . et2 es et1 ex1 et0 ex0', C, true),
      TMOD: new BitFieldSFR('TMOD', 0x89, 'gate1 ct1 t1m1 t1m0 gate0 ct0 t0m1 t0m0', C),
      TCON: new BitFieldSFR('TCON', 0x88, 'tf1 tr1 tf0 tr0 ie1 it1 ie0 it0', C, true),
      T2CON: new BitFieldSFR('T2CON', 0xC8, 'tf2 exf2 rclk tclk exen2 tr2 ct2 cprl2', C, true),
      TH0: new SFR('TH0', 0x8C, C),
      TL0: new SFR('TL0', 0x8A, C),
      TH1: new SFR('TH1', 0x8D, C),
      TL1: new SFR('TL1', 0x8B, C),
      TH2: new SFR('TH2', 0xCD, C),
      TL2: new SFR('TL2', 0xCC, C),
      RCAP2H: new SFR('RCAP2H', 0xCB, C),
      RCAP2L: new SFR('RCAP2L', 0xCA, C),
      SCON: new BitFieldSFR('SCON', 0x98, 'sm0 sm1 sm2 ren tb8 rb8 ti ri', C, true),
      SBUF: new SFR('SBUF', 0x99, C),
      PCON: new BitFieldSFR('PCON', 0x87, 'smod . . . gf1 gf0 pd idl', C),
    };


    C.aSFR = new Proxy({}, {

      get: function(target, ea) {
        return C[DIRtoSFR[+ea]];
      },

      set: function(target, ea, v) {
        C[DIRtoSFR[+ea]] = v;
        return true;
      },
    });


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
    const getDPTR = () => C.DPH << 8 | C.DPL;
    const getCY = () => C.CY;

    const putA = v => C.ACC = v;
    const putDIR = v => C.setDIR(C.code[(C.opPC + 1) & 0xFFFFF], v);
    const putDIR2 = v => C.setDIR(C.code[(C.opPC + 2) & 0xFFFFF], v);
    const putBIT = v => C.setBIT(C.code[(C.opPC + 1) & 0xFFFF], v);
    const clearBIT = () => putBIT(0);
    const putR = v => C.setR(C.op & 0x7, v);
    const putRi = v => C.iram[C.getR(C.op & 0x1)] = v;
    const putDPTR = v => {C.DPH = v >>> 8; C.DPL = v};
    const putCY = v => C.CY = v;


    Object.defineProperty(C, 'DPTR', {
      get: getDPTR,
      set: putDPTR,
    });


    function genSimple(mnemonic, op, nBytes, f) {

      return C.ops[op] = {
        mnemonic,
        nBytes,

        f: C => {
          C.PC = (C.PC + nBytes) & 0xFFFF;
          f(C);
        },
      };
    }

    function genOp(mnemonic, op, nBytes, putResult, getA, getB, opF) {
      C.ops[op] = {mnemonic, nBytes, f: function(C) {
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
      C.ops[op + 0x02] = {mnemonic, nBytes: 2, f: bitBIT(C, opF)};
      C.ops[op + 0x03] = {mnemonic, nBytes: 1, f: bitCY(C, opF)};

      if (accOpF) {
        C.ops[accOp] = {mnemonic, nBytes: 1, f: singleton(C, accOpF)};
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

    genSimple('NOP', 0x00, 1, () => 0);
    genSimple('A5', 0xA5, 1, () => 0);
    genSimple('DA', 0xD4, 1, doDA);
    genSimple('XCHD', 0xD6, 1, genXCHD(0));
    genSimple('XCHD', 0xD7, 1, genXCHD(1));

    
    function genXCH(op, nBytes, getV, putV) {
      C.ops[op] = {mnemonic: 'XCH', nBytes, f: function(C) {
        C.PC = (C.PC + nBytes) & 0xFFFF;
        const a = C.ACC;
        const v = getV();
        putV(a);
        C.ACC = v;
      }};
    }

    _.times(8, r => genXCH(0xC8 + r, 1, getR, putR));
    _.times(2, i => genXCH(0xC6 + i, 1, getRi, putRi));
    genXCH(0xC5, 2, getDIR, putDIR);
    genXCH(0xC7, 1, getRi, putRi);


    _.times(8, genAJMP);
    _.times(8, genACALL);
    genSimple('RET', 0x22, 1, doRET);
    genSimple('RETI', 0x32, 1, doRETI);
    genSimple('LCALL', 0x12, 3, doLCALL);
    genSimple('LJMP', 0x02, 3, doLJMP);
    genSimple('RL', 0x23, 1, doRL);
    genSimple('RLC', 0x33, 1, doRLC);
    genSimple('RR', 0x03, 1, doRR);
    genSimple('RRC', 0x13, 1, doRRC);
    genSimple('SJMP', 0x80, 2, doSJMP);
    genSimple('JMP', 0x73, 1, doJMP_);

    const yesB = b => b;
    const notB = b => !b;

    genJxx('JBC', 0x10, 3, getBIT, clearBIT, yesB);
    genJxx('JB', 0x20, 3, getBIT, null, yesB);
    genJxx('JNB', 0x30, 3, getBIT, null, notB);
    genJxx('JC', 0x40, 2, getCY, null, yesB);
    genJxx('JNC', 0x50, 2, getCY, null, notB);
    genJxx('JZ', 0x60, 2, getA, null, notB);
    genJxx('JNZ', 0x70, 2, getA, null, yesB);

    genCJNE('CJNE', 0xB4, 3, getA, getIMM);
    genCJNE('CJNE', 0xB5, 3, getA, getDIR);
    _.times(8, r => genCJNE('CJNE', 0xB8 + r, 3, getR, getIMM));
    _.times(2, i => genCJNE('CJNE', 0xB6 + i, 3, getRi, getIMM));

    genDJNZ('DJNZ', 0xD5, 3, getDIR, putDIR);
    _.times(8, r => genDJNZ('DJNZ', 0xD8 + r, 2, getR, putR));

    function genDJNZ(mnemonic, op, nBytes, getF, putF) {

      return C.ops[op] = {
        mnemonic,
        nBytes,

        f: C => {
          const rel = C.code[(C.opPC + nBytes - 1) & 0xFFFF];
          C.PC = (C.PC + nBytes) & 0xFFFF;
          let v = getF();
          v = (v - 1) & 0xFF;
          putF(v);
          if (v !== 0) C.PC = (C.PC + toSigned(rel)) & 0xFFFF;
        },
      };
    }


    const doINC = v => (v + 1) & 0xFF;
    const doINC16 = v => (v + 1) & 0xFFFF;
    const doDEC = v => (v - 1) & 0xFF;


    genINCDEC('DEC', 0x14, 1, getA, doDEC, putA);
    genINCDEC('DEC', 0x15, 2, getDIR, doDEC, putDIR);
    _.times(8, r => genINCDEC('DEC', 0x18 + r, 1, getR, doDEC, putR));
    _.times(2, i => genINCDEC('DEC', 0x16 + i, 1, getRi, doDEC, putRi));

    genINCDEC('INC', 0x04, 1, getA, doINC, putA);
    genINCDEC('INC', 0x05, 2, getDIR, doINC, putDIR);
    _.times(8, r => genINCDEC('INC', 0x08 + r, 1, getR, doINC, putR));
    _.times(2, i => genINCDEC('INC', 0x06 + i, 1, getRi, doINC, putRi));
    genINCDEC('INC', 0xA3, 1, getDPTR, doINC16, putDPTR);

    _.times(8, r => genMOV('MOV', 0xE8 + r, 1, getR, putA));
    genMOV('MOV', 0xE5, 2, getDIR, putA);
    _.times(2, i => genMOV('MOV', 0xE6 + i, 1, getRi, putA));
    genMOV('MOV', 0x74, 2, getIMM, putA);
    _.times(8, r => genMOV('MOV', 0xF8 + r, 1, getA, putR));
    _.times(8, r => genMOV('MOV', 0xA8 + r, 2, getDIR, putR));
    _.times(8, r => genMOV('MOV', 0x78 + r, 2, getIMM, putR));
    genMOV('MOV', 0xF5, 2, getA, putDIR);
    _.times(8, r => genMOV('MOV', 0x88 + r, 2, getR, putDIR));
    genMOV('MOV', 0x85, 3, getDIR, putDIR2);
    _.times(2, i => genMOV('MOV', 0x86 + i, 2, getRi, putDIR));
    _.times(2, i => genMOV('MOV', 0x76 + i, 2, getIMM, putRi));
    genMOV('MOV', 0x75, 3, getIMM2, putDIR);
    _.times(2, i => genMOV('MOV', 0xA6 + i, 2, getDIR, putRi));
    _.times(8, r => genMOV('MOV', 0xA8 + r, 2, getDIR, putR));
    _.times(2, i => genMOV('MOV', 0xF6 + i, 1, getA, putRi));

    genSimple('MOV', 0xA2, 2, C => C.CY = getBIT());
    genSimple('MOV', 0x92, 2, C => putBIT(C.CY));
    genSimple('MOV', 0x90, 3, C => {C.DPH = getIMM(); C.DPL = getIMM2()});

    const getA_PC = () => C.code[(C.ACC + C.PC) & 0xFFFF];
    const getA_DPTR = () => C.code[(C.ACC + getDPTR()) & 0xFFFF];

    genMOV('MOVC', 0x83, 1, getA_PC, putA);
    genMOV('MOVC', 0x93, 1, getA_DPTR, putA);

    const xAddr = a => C.P2 << 8 | a;
    const getXRi = () => C.xram[xAddr(C.getR(C.op & 0x01))];
    const getXDPTR = () => C.xram[getDPTR()];
    const putXRi = v => C.xram[xAddr(C.getR(C.op & 0x01))] = v;
    const putXDPTR = v => C.xram[getDPTR()] = v;
    
    _.times(2, i => genMOV('MOVX', 0xE2 + i, 1, getXRi, putA));
    _.times(2, i => genMOV('MOVX', 0xF2 + i, 1, getA, putXRi));
    genMOV('MOVX', 0xE0, 1, getXDPTR, putA);
    genMOV('MOVX', 0xF0, 1, getA, putXDPTR);

    genSimple('PUSH', 0xC0, 2, () => C.push8(getDIR()));
    genSimple('POP', 0xD0, 2, () => putDIR(C.pop8()));
    genSimple('SWAP', 0xC4, 1, doSWAP);


    function genMOV(mnemonic, op, nBytes, getF, putF) {

      return C.ops[op] = {
        mnemonic,
        nBytes,

        f: C => {
          C.PC = (C.PC + nBytes) & 0xFFFF;
          const v = getF();
          putF(v);
        },
      };
    }

    genSimple('DIV', 0x84, 1, doDIV);
    genSimple('MUL', 0xA4, 1, doMUL);


    if (false) {
      console.warn(`Remaining undefined opcodes:
${(() => {const list = _.range(0x100)
            .filter(op => C.ops[op] == null)
            .map(op => toHex2(op));
          return list.join(' ') + `
${list.length} ops unimplemented`;})()}`);
    }
    

    function genINCDEC(mnemonic, op, nBytes, getV, opF, putV) {
      
      return C.ops[op] = {
        mnemonic,
        nBytes,

        f: C => {
          C.PC = (C.PC + nBytes) & 0xFFFF;
          let v = getV();
          v = opF(v);
          putV(v);
        },
      };
    }


    function genCJNE(mnemonic, op, nBytes, getF1, getF2) {
      
      return C.ops[op] = {
        mnemonic,
        nBytes,

        f: C => {
          C.PC = (C.PC + nBytes) & 0xFFFF;
          const rel = C.code[(C.opPC + nBytes - 1) & 0xFFFF];
          const a = getF1(C);
          const b = getF2(C);
          C.CY = a < b ? 1 : 0;
          if (a !== b) C.PC = (C.PC + toSigned(rel)) & 0xFFFF;
        },
      };
    }


    function doSJMP(C) {
      const rel = C.code[(C.opPC + 1) & 0xFFFF];
      C.PC = (C.PC + toSigned(rel)) & 0xFFFF;
    }


    function doJMP_(C) {
      const rel = C.code[(C.opPC + 1) & 0xFFFF];
      C.PC = (C.ACC + C.DPTR) & 0xFFFF;
    }


    function genJxx(mnemonic, op, nBytes, getF, putBit, brTestF) {

      return C.ops[op] = {
        mnemonic,
        nBytes,

        f: C => {
          const rel = C.code[(C.opPC + nBytes - 1) & 0xFFFF];
          C.PC = (C.PC + nBytes) & 0xFFFF;
          let b = getF();
          if (putBit) putBit();
          if (brTestF(b)) C.PC = (C.PC + toSigned(rel)) & 0xFFFF;
        },
      };
    }


    function genAJMP(p) {

      genSimple('AJMP', p << 5 | 0x01, 2, C => {
        const lo = C.code[(C.opPC + 1) & 0xFFFF];
        C.PC = ((C.PC + 2) & 0xF800) | (p << 8) | lo;
      });
    }


    function genACALL(p) {

      genSimple('ACALL', p << 5 | 0x11, 2, C => {
        const lo = C.code[(C.opPC + 1) & 0xFFFF];
        C.push16(C.PC);
        C.PC = (C.PC & 0xF800) | p << 8 | lo;
      });
    }


    function doLCALL(C) {
      const hi = C.code[(C.opPC + 1) & 0xFFFF];
      const lo = C.code[(C.opPC + 2) & 0xFFFF];
      C.push16(C.PC);
      C.PC = hi << 8 | lo;
    }
    

    function doLJMP(C) {
      const hi = C.code[(C.opPC + 1) & 0xFFFF];
      const lo = C.code[(C.opPC + 2) & 0xFFFF];
      C.PC = hi << 8 | lo;
    }
    

    function genXCHD(r) {

      return function(C) {
        const a = C.ACC;
        const b = C.iram[C.getR(r)];
        C.ACC &= 0xF0;
        C.ACC |= b & 0x0F;
        C.iram[C.getR(r)] &= 0xF0;
        C.iram[C.getR(r)] |= a & 0x0F;
      };
    }


    function doRET(C) {
      const pcH = C.pop8();
      const pcL = C.pop8();
      C.PC = pcH << 8 | pcL;
    }


    function doRETI(C) {
      if (C.ipl >= 0) C.ipl = C.ipl - 1;
      doRET(C);
    }


    function doDA() {

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


    function doMUL() {
      let a = C.ACC;
      let b = C.B;

      const result = a * b;
      C.CY = 0;                // Always clears CY.
      C.OV = +(result > 0xFF);
      b = result >>> 8;

      C.ACC = result & 0xFF;
      C.B = b;
    }


    function doDIV() {
      let a = C.ACC;
      let b = C.B;

      // DIV always clears CY. DIV sets OV on divide by 0.
      C.CY = 0;

      if (b === 0) {
        C.OV = 1;
      } else {
        const curA = a;
        a = Math.floor(curA / b);
        b = curA % b;
      }

      C.ACC = a;
      C.B = b;
    }


    function doSWAP() {
      C.ACC = (C.ACC & 0x0F) << 4 | (C.ACC & 0xF0) >> 4;
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


  pop8() {
    const C = this;
    let sp = C.SP;
    const v = C.iram[sp];
    sp = (sp - 1) & 0xFF;
    C.SP = sp;
    return v;
  };


  push8(v) {
    const C = this;
    let sp = C.SP;

    sp = (sp + 1) & 0xFF;
    C.iram[sp] = v;

    C.SP = sp;
  }
  

  push16(v) {
    const C = this;
    let sp = C.SP;

    sp = (sp + 1) & 0xFF;
    C.iram[sp] = v;

    sp = (sp + 1) & 0xFF;
    C.iram[sp] = v >>> 8;

    C.SP = sp;
  }


  handleInterruptChange() {
    const C = this;

    C.intChange = false;       // No change remains

    const ie = C.IE;           // Faster and easier to type
    let ip = C.IP & ie;        // Result of masking ints at each level
    if (!ie) return;           // Nothing enabled = nothing to do

    handlePending(1, C.IP & ie) || handlePending(0, ie);


    // Called for each interrupt priority `level` with mask of
    // interrupts possibly `pending` at that level. Checks for
    // interrupt actually pending, and, if so, handles interrupt
    // `LCALL` to appropriate IRQ vector and sets the IPL to match the
    // level of the interrupt we are handling. Returns `true` if we
    // are handling an interrupt.
    function handlePending(level, pending) {

      if (C.ipl >= level) return false;

      const intHandlers = [
        {pendingMask: 0x01, prioMask: 'IE0',  vector: 0x0003},
        {pendingMask: 0x04, prioMask: 'TF0',  vector: 0x000B},
        {pendingMask: 0x02, prioMask: 'IE1',  vector: 0x0013},
        {pendingMask: 0x08, prioMask: 'TF1',  vector: 0x001B},
        {pendingMask: 0x10, prioMask: 'RI',   vector: 0x0023},
        {pendingMask: 0x10, prioMask: 'TI',   vector: 0x0023},
        {pendingMask: 0x20, prioMask: 'TF2',  vector: 0x002B},
        {pendingMask: 0x20, prioMask: 'EXF2', vector: 0x002B},
      ];

      for (let h of intHandlers) {

        if ((pending & h.pendingMask) && C[h.prioMask]) {
          C.push16(C.PC);
          C.PC = h.vector;
          C.ipl = level;
          return true;
        }
      }

      return false;
    }
  }
  

  run1(pc = this.PC) {
    const C = this;

    // If we have a change in anything in the interrupt system, go
    // look into it. If an interrupt handler needs to run,
    // C.handleInterruptChange() pushes the current PC, changes the
    // IPL, and sets the PC to the vector for the interrupt.
    if (C.intChange) C.handleInterruptChange();

    C.opPC = C.PC = pc;
    C.op = C.code[pc];
    C.ops[C.op].f(C);
  };


  getR(r) { return this.iram[r + (this.RS1 << 4 | this.RS0 << 3)] }
  setR(r, v) { this.iram[r + (this.RS1 << 4 | this.RS0 << 3)] = v }


  // TODO: this.the getDIR and setDIR accessors need to switch on address
  // and access the appropriate SFRs member instance where needed.
  getDIR(ea) {
    ea = +ea;
    const v = ea < 0x80 ? this.iram[ea] : this.aSFR[ea];
    return v;
  }

  setDIR(ea, v) {
    ea = +ea;

    if (ea < 0x80)
      this.iram[ea] = v;
    else {
      this.aSFR[ea] = v;
    }
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
      return +!!(this.aSFR[ea] & mask);
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
        this.aSFR[ea] |= mask;
      } else {
        this.aSFR[ea] &= ~mask;
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
