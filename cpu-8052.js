// Definitions of MCS8052 CPU architecture.
'use strict';
const _ = require('lodash');


/*
# Access examples

cpu.ACC = 0x12;
cpu.ACC += 0x42;
cpu.B = cpu.ACC;

cpu.PSW.OV = 1;
 */


const cpu = {};
module.exports.cpu = cpu;


class SFR {

  constructor(name, addr, resetValue) {
    this.addr = addr;
    this.resetValue = resetValue || 0x00;
    this.name = name;

    Object.defineProperty(cpu, name, {
      enumerable: true,

      get: () => {
        console.log(`get cpu.${name}=${this._v}`);
        return this._v;
      },

      set: v => {
        console.log(`set cpu.${name}=${v}`);
        this._v = v;
      },
    });
  }
};


class BitAddressableSFR extends SFR {

  constructor(name, addr, bitNames, resetValue) {
    super(name, addr, resetValue);
    let parentObj = this;

    if (bitNames) {
      // Take a string and add get/set methods to treat each as a
      // single bit of the parent object's value. Define properties
      // xBit (bit address), xShift, and xMask for each bit. The
      // string is a space separated list of fields left to right
      // where the leftmost is bit #n and rightmost is bit #0 and '.'
      // is used for a reserved bit.
      bitNames.split(/\s+/)
        .reverse()
        .map((name, index) => {

          if (name !== '.') {
            const mask = 1 << index;

            this[name + 'Shift'] = index;
            this[name + 'Mask'] = mask;
            this[name + 'Bit'] = addr + index;

            Object.defineProperty(this, name.toUpperCase(), {
              enumerable: true,
              get: () => +!!(parentObj.value & mask),

              set(v) {

                if (v)
                  parentObj.value |= mask;
                else
                  parentObj.value &= ~mask;

                return true;
              },
            });
          }
        });
    }
  }
};


const SFRs = {
  PSW: new BitAddressableSFR('PSW', 0xD0, 'cy ac f0 rs1 rs0 ov ud p'),
  ACC: new BitAddressableSFR('ACC', 0xE0),
  B: new BitAddressableSFR('B', 0xF0),
  SP: new SFR('SP', 0x81, 0x07),
  DPL: new SFR('DPL', 0x82),
  DPH: new SFR('DPH', 0x83),
  P0: new BitAddressableSFR('P0', 0x80, null, 0xFF),
  P1: new BitAddressableSFR('P1', 0x90, null, 0xFF),
  P2: new BitAddressableSFR('P2', 0xA0, null, 0xFF),
  P3: new BitAddressableSFR('P3', 0xB0, null, 0xFF),
  IP: new BitAddressableSFR('IP', 0xB8, '. . pt2 ps pt1 px1 pt0 px0'),
  IE: new BitAddressableSFR('IE', 0xA8, 'ea . et2 es et1 ex1 et0 ex0'),
  TMOD: new SFR('TMOD', 0x89, 'gate1 ct1 t1m1 t1m0 gate0 ct0 t0m1 t0m0'),
  TCON: new SFR('TCON', 0x88, 'tf1 tr1 tf0 tr0 ie1 it1 ie0 it0'),
  T2CON: new SFR('T2CON', 0xC8, 'tf2 exf2 rclk tclk exen2 tr2 ct2 cprl2'),
  TH0: new SFR('TH0', 0x8C),
  TL0: new SFR('TL0', 0x8A),
  TH1: new SFR('TH1', 0x8D),
  TL1: new SFR('TL1', 0x8B),
  TH2: new SFR('TH2', 0xCD),
  TL2: new SFR('TL2', 0xCC),
  RCAP2H: new SFR('RCAP2H', 0xCB),
  RCAP2L: new SFR('RCAP2L', 0xCA),
  SCON: new BitAddressableSFR('SCON', 0x98, 'sm0 sm1 sm2 ren tb8 rb8 ti ri'),
  SBUF: new SFR('SBUF', 0x99),
  PCON: new SFR('PCON', 0x87, 'smod . . . gf1 gf0 pd idl'),
};
module.exports.SFRs = SFRs;


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


// Define the SFRs as module export symbols directly
Object.keys(SFRs).forEach(sfr => module.exports[sfr] = SFRs[sfr]);


if (require.main === module) {

  // If this is run as main module, test a makeBits function a few
  // ways.
  const s1 = 'a7 b6 c5 d4 e3 f2 g1 h0';
  console.log(`makeBits(0x80, "${s1}") =`, makeBits(0x80, s1));

  const s2 = 'a7 b6 . d4 . f2 . h0';
  console.log(`makeBits(0x90, "${s2}") =`, makeBits(0x90, s2));
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
