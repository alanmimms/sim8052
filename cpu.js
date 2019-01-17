// Definitions of MCS8052 CPU architecture.

const _ = require('lodash');

// These constants simplify accesses to SFRs.
const SFRs = {
  ACC: 0xE0,
  B: 0xF0,
  SP: 0x81,
  P0: 0x80,
  P1: 0x90,
  P2: 0xA0,
  P3: 0xB0,
  IP: 0xB8,
  IE: 0xA8,
  TMOD: 0x89,
  TCON: 0x88,
  T2CON: 0xC8,
  T2MOD: 0xC9,
  TH0: 0x8C,
  TL0: 0x8A,
  TH1: 0x8D,
  TL1: 0x8B,
  TH2: 0xCD,
  TL2: 0xCC,
  RCAP2H: 0xCB,
  RCAP2L: 0xCA,
  PCON: 0x87,
  PSW: 0xD0,
  DPL: 0x82,
  DPH: 0x83,
  SCON: 0x98,
  SBUF: 0x99,
};


const pswBits = makeBits(SFRs.PSW, 'cy ac f0 rs1 rs0 ov ud p');
const pconBits = makeBits(SFRs.PCON, 'smod . . . gf1 gf0 pd idl');
const sconBits = makeBits(SFRs.SCON, 'sm0 sm1 sm2 ren tb8 rb8 ti ri');
const ipBits = makeBits(SFRs.IP, '. . pt2 ps pt1 px1 pt0 px0');
const ieBits = makeBits(SFRs.IE, 'ea . et2 es et1 ex1 et0 ex0');
const tmodBits = makeBits(SFRs.TMOD, 'gate1 ct1 t1m1 t1m0 gate0 ct0 t0m1 t0m0');
const tconBits = makeBits(SFRs.TCON, 'tf1 tr1 tf0 tr0 ie1 it1 ie0 it0');
const t2conBits = makeBits(SFRs.T2CON, 'tf2 exf2 rclk tclk exen2 tr2 ct2 cprl2');


module.exports = {
  makeBits,
  SFRs,

  pswBits,
  pconBits,
  sconBits,
  ipBits,
  ieBits,
  tmodBits,
  tconBits,
  t2conBits,

  mathMask: pswBits.ovMask | pswBits.acMask | pswBits.cyMask,
  rsMask: pswBits.rs0Mask | pswBits.rs1Mask,

  parityTable: [
    0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
    1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
    1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
    0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
    1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
    0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
    0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
    1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
  ],
};


// Define the SFRs as module export symbols directly
Object.keys(SFRs).forEach(sfr => module.exports[sfr] = module.exports.SFRs[sfr]);


// Take a string and return a bit field object containing xBit (bit
// address), xShift, and xMask values for each bit. The string is a
// space separated list of fields left to right where the leftmost is
// bit #n and rightmost is bit #0 and '.' is used for a reserved bit.
function makeBits(base, bitDescriptorString) {
  const o = {};

  bitDescriptorString.split(/\s+/)
    .reverse()
    .map((name, index) => {

      if (name !== '.') {
        o[name + 'Shift'] = index;
        o[name + 'Mask'] = 1 << index;
        o[name + 'Bit'] = base + index;
      }
    });

  return o;
}


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
