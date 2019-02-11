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

  constructor(addr, resetValue) {
    this.addr = addr;
    this.resetValue = resetValue || 0x00;

    Object.defineProperty(this, 'v', {
      enumerable: true,

      get: () => {
        return this._v;
      },

      set: v => {
        this._v = v;
      },
    });
  }
};


class BitAddressableSFR extends SFR {

  constructor(addr, bitNames, resetValue) {
    super(addr, resetValue);
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
  PSW: new BitAddressableSFR(0xD0, 'cy ac f0 rs1 rs0 ov ud p'),
  ACC: new BitAddressableSFR(0xE0),
  B: new BitAddressableSFR(0xF0),
  SP: new SFR(0x81, 0x07),
  DPL: new SFR(0x82),
  DPH: new SFR(0x83),
  P0: new BitAddressableSFR(0x80, null, 0xFF),
  P1: new BitAddressableSFR(0x90, null, 0xFF),
  P2: new BitAddressableSFR(0xA0, null, 0xFF),
  P3: new BitAddressableSFR(0xB0, null, 0xFF),
  IP: new BitAddressableSFR(0xB8, '. . pt2 ps pt1 px1 pt0 px0'),
  IE: new BitAddressableSFR(0xA8, 'ea . et2 es et1 ex1 et0 ex0'),
  TMOD: new SFR(0x89, 'gate1 ct1 t1m1 t1m0 gate0 ct0 t0m1 t0m0'),
  TCON: new SFR(0x88, 'tf1 tr1 tf0 tr0 ie1 it1 ie0 it0'),
  T2CON: new SFR(0xC8, 'tf2 exf2 rclk tclk exen2 tr2 ct2 cprl2'),
  TH0: new SFR(0x8C),
  TL0: new SFR(0x8A),
  TH1: new SFR(0x8D),
  TL1: new SFR(0x8B),
  TH2: new SFR(0xCD),
  TL2: new SFR(0xCC),
  RCAP2H: new SFR(0xCB),
  RCAP2L: new SFR(0xCA),
  SCON: new BitAddressableSFR(0x98, 'sm0 sm1 sm2 ren tb8 rb8 ti ri'),
  SBUF: new SFR(0x99),
  PCON: new SFR(0x87, 'smod . . . gf1 gf0 pd idl'),
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
