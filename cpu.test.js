'use strict';

const {toHex1, toHex2, toHex4} = require('./simutils');
const {CPU8052, SFRs} = require('./cpu-8052');

const code = Buffer.alloc(0x10000, 0x00, 'binary');
const xram = Buffer.alloc(0x10000, 0x00, 'binary');

const cpu = new CPU8052(code, xram);

// Define each SFR address globally
Object.keys(SFRs).forEach(name => global[name] = SFRs[name]);


function test() {
  code[0x100] = 0x52;             // ANL A,dir
  code[0x101] = 0x42;             // dir
  cpu.iram[0x42] = 0xFA;
  cpu.ACC.v = 0x53;

  cpu.run1(0x100);
  console.log(`After PC=${toHex4(cpu.PC)}, A=${toHex2(cpu.ACC.v)}`);
}


test();
