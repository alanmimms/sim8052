'use strict';
const _ = require('lodash');

const {toHex1, toHex2, toHex4} = require('./simutils');
const {CPU8052} = require('./cpu-8052');

const CODESize = 65536;
const XRAMSize = 65536;

const code = Buffer.alloc(CODESize, 0x00, 'binary');
const xram = Buffer.alloc(XRAMSize, 0x00, 'binary');

const cpu = new CPU8052(code, xram);


// Indexed by opcode. If zero, it means opcode was not tested.
const coverage = Array(256).fill(0);


// Use this function to store a code byte into cpu.code[] to account
// for code coverage of the op. Can also be use to write non-opcode
// data into code array with false as third parameter.
function putCode(addr, op, countCoverage = true) {
  cpu.code[addr] = op
  if (countCoverage) ++coverage[op];
  return op;
}


afterAll(() => {
    console.warn(`Remaining untested opcodes:
${(() => {const list = _.range(0x100)
.filter(op => coverage[op] == 0)
.map(op => toHex2(op));
   return list.join(' ') + `
${list.length} ops untested`;})()}`);
});


// Always start with a clean slate
beforeEach(() => {
  clearIRAM();
  cpu.reset();
});


//////////// NOP ////////////
test('op:NOP', () => {
  putCode(0x100, 0x00);       // NOP
  cpu.ACC = 0x42;
  cpu.PSW = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.PSW).toBe(0);
  expect(cpu.ACC).toBe(0x42);
});

//////////// ACALL/RET ////////////
describe.each([0, 1, 2, 3, 4, 5, 6, 7])('op:ACALL/op:RET', fromPage => {

  test(`page${fromPage}`, () => {
    const pageOffset = 0x24;
    const callBase = fromPage * 0x100 + 0x42;

    clearIRAM();

    for (let toPage = 0; toPage < 8; ++toPage) {
      const callTarget = (toPage * 0x100) + pageOffset;
      putCode(callBase, (toPage * 0x20) + 0x11);        // ACALL pageN
      putCode(callBase + 1, pageOffset, false);
      putCode(callTarget, 0x22);                 // RET

      cpu.ACC = 0x42;
      cpu.PSW = 0;
      cpu.SP = 0x07;

      cpu.run1(callBase);                       // CALL
      expect(cpu.PC).toBe(callTarget);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(0x42);
      expect(cpu.SP).toBe(0x09);
      cpu.run1(callTarget);                     // RET
      expect(cpu.PC).toBe(callBase + 2);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(0x42);
      expect(cpu.SP).toBe(0x07);

      // Clean out RET for next iter
      cpu.code[callTarget] = 0x00; // Do not count for coverage since not to be executed
    }
  });
});


//////////// LCALL/RETI ////////////
describe.each([
// callBase   newPC
  [0x8765,   0x0000],
  [0x8765,   0x0001],
  [0x88FD,   0x1234],
  [0x89FE,   0xFFFE],
  [0x8AFF,   0xFFFF],
  [0x8BFD,   0x7FFF],
])('op:LCALL/op:RETI', (callBase, newPC) => {
  test(`${toHex4(callBase)} --> ${toHex4(newPC)}`, () => {
    const retPC = (callBase + 3) & 0xFFFF;
    const acBase = 0x43;
    const spBase = 7;

    clearIRAM();
    putCode(callBase, 0x12);      // LCALL
    putCode(callBase + 1, newPC >>> 8, false);
    putCode(callBase + 2, newPC & 0xFF, false);
    putCode(newPC, 0x32);         // RETI

    cpu.ACC = acBase;
    cpu.PSW = 0;
    cpu.SP = spBase;

    cpu.run1(callBase);             // LCALL
    expect(cpu.PC).toBe(newPC);
    expect(cpu.PSW).toBe(0);
    expect(cpu.ACC).toBe(acBase);
    expect(cpu.SP).toBe(spBase + 2);
    expect(cpu.iram[spBase+2]).toBe(retPC >>> 8);
    expect(cpu.iram[spBase+1]).toBe(retPC & 0xFF);
    cpu.run1(newPC);                // RET
    expect(cpu.PC).toBe(retPC);
    expect(cpu.PSW).toBe(0);
    expect(cpu.ACC).toBe(acBase);
    expect(cpu.SP).toBe(spBase);
  });
});


//////////// LJMP ////////////
describe.each([
// callBase   newPC
  [0x8765,   0x0000],
  [0x8765,   0x0001],
  [0x88FD,   0x1234],
  [0x89FE,   0xFFFE],
  [0x8AFF,   0xFFFF],
  [0x8BFD,   0x7FFF],
])('op:LJMP', (callBase, newPC) => {
  test(`${toHex4(callBase)} --> ${toHex4(newPC)}`, () => {
    const retPC = (callBase + 3) & 0xFFFF;
    const acBase = 0x43;
    const spBase = 7;

    clearIRAM();
    putCode(callBase, 0x02);      // LJMP
    putCode(callBase + 1, newPC >>> 8, false);
    putCode(callBase + 2, newPC & 0xFF, false);

    cpu.ACC = acBase;
    cpu.PSW = 0;
    cpu.SP = spBase;

    cpu.run1(callBase);             // JMP
    expect(cpu.PC).toBe(newPC);
    expect(cpu.PSW).toBe(0);
    expect(cpu.ACC).toBe(acBase);
    expect(cpu.SP).toBe(spBase);
  });
});


//////////// SJMP ////////////
describe.each([
// callBase  rela   newPC
  [0x8765,   0xF0, 0x8757],
  [0x8765,   0xFF, 0x8766],
  [0x88FD,   0x00, 0x88FF],
  [0xFFFE,   0x01, 0x0001],
  [0xFFFE,   0x02, 0x0002],
  [0xFFF0,   0x03, 0xFFF5],
])('op:SJMP', (pc, rela, newPC) => {
  test(`${toHex4(pc)} --> ${toHex4(newPC)}`, () => {
    const basePC = (pc + 2) & 0xFFFF;
    const acBase = 0x43;

    clearIRAM();
    putCode(pc, 0x80);      // SJMP
    putCode(pc + 1, rela, false);
    cpu.ACC = acBase;
    cpu.PSW = 0;

    cpu.run1(pc);             // SJMP
    expect(cpu.PC).toBe(newPC);
    expect(cpu.PSW).toBe(0);
    expect(cpu.ACC).toBe(acBase);
  });
});


//////////// AJMP ////////////
describe.each([0x0000, 0x0800,
               0x1000, 0x1800,
               0x3000, 0x3800,
               0x7000, 0x7800,
               0xE000, 0xE800,
               0xF000, 0xF800])('AJMP', fromPage => {

  test(`op:AJMP from page ${toHex4(fromPage)}`, () => {
    const fromOffset = 0x324;
    const jmpBase = fromPage | fromOffset;
    const spBase = 0x07;
    const acBase = 0x42;

    clearIRAM();

    _.range(0, 8).forEach(toMid => {
      const toOffset = 0x33;
      const jmpTarget = fromPage | toMid << 8 | toOffset;
      putCode(jmpBase, toMid << 5 | 0x01);      // AJMP pageN
      putCode(jmpBase + 1, jmpTarget & 0xFF, false);

      cpu.ACC = acBase;
      cpu.PSW = 0;
      cpu.SP = spBase;

      cpu.run1(jmpBase);                       // AJMP
      expect(cpu.PC).toBe(jmpTarget);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(acBase);
      expect(cpu.SP).toBe(spBase);
    });
  });
});


//////////// CJNE ////////////
describe.each([
  // x    y     CY rela   jump
  [0x00, 0x00,  0, 0x00,    0],
  [0x00, 0x01,  1, 0x20,    1],
  [0x01, 0x00,  0, 0x40,    1],
  [0x42, 0x42,  0, 0x33,    0],
  [0xFF, 0x00,  0, 0x60,    1],
  [0x00, 0xFF,  1, 0x80,    1],
  [0x00, 0xFF,  1, 0xF0,    1],
]) (
  'op:CJNE',
  (x, y, ltCY, rela, jump)  => {
    test(`A,dir,rel A=${toHex2(x)} dir=${toHex2(y)}, ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0xB5);       // CJNE A,dir,rela
      putCode(0x101, dir, false);
      putCode(0x102, rela, false);
      cpu.PSW = 0;
      cpu.ACC = x;
      cpu.iram[dir] = y;

      cpu.run1(0x100);              // CJNE A,dir,rela
      expect(cpu.PC).toBe(jump ? 0x103 + toSigned(rela) : 0x103);
      expect(cpu.ACC).toBe(x);
      expect(cpu.iram[dir]).toBe(y);
      expect(cpu.CY).toBe(ltCY);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`A,#imm,rel A=${toHex2(x)} imm=${toHex2(y)}, ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`, () => {
      const imm = y;
      clearIRAM();
      putCode(0x100, 0xB4);       // CJNE A,dir,rela
      putCode(0x101, imm, false);
      putCode(0x102, rela, false);
      cpu.PSW = 0;
      cpu.ACC = x;

      cpu.run1(0x100);              // CJNE A,#imm,rela
      expect(cpu.PC).toBe(jump ? 0x103 + toSigned(rela) : 0x103);
      expect(cpu.ACC).toBe(x);
      expect(cpu.CY).toBe(ltCY);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`R3,#imm,rel R3=${toHex2(x)} imm=${toHex2(y)}, ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`, () => {
      const imm = y;
      clearIRAM();
      putCode(0x100, 0xBB);       // CJNE R3,#imm,rela
      putCode(0x101, imm, false);
      putCode(0x102, rela, false);
      cpu.PSW = 0;
      cpu.iram[3] = x;

      cpu.run1(0x100);              // CJNE A,#imm,rela
      expect(cpu.PC).toBe(jump ? 0x103 + toSigned(rela) : 0x103);
      expect(cpu.iram[3]).toBe(x);
      expect(cpu.CY).toBe(ltCY);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`@R1,#imm,rel @R1=${toHex2(x)} imm=${toHex2(y)}, ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`, () => {
      const imm = y;
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0xB7);       // CJNE @R1,#imm,rela
      putCode(0x101, imm, false);
      putCode(0x102, rela, false);
      cpu.PSW = 0;
      cpu.iram[dir] = x;
      cpu.iram[1] = dir;

      cpu.run1(0x100);              // CJNE @R1,#imm,rela
      expect(cpu.PC).toBe(jump ? 0x103 + toSigned(rela) : 0x103);
      expect(cpu.iram[1]).toBe(dir);
      expect(cpu.iram[dir]).toBe(x);
      expect(cpu.CY).toBe(ltCY);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
  });


//////////// DJNZ ////////////
describe.each([
  // x    y    jump
  [0x02, 0x01,  1],
  [0x01, 0x00,  0],
  [0x00, 0xFF,  1],
  [0x80, 0x7F,  1],
]) ('op:DJNZ',
  (x, y, jump)  => {
    test(`DJNZ dir,rel dir=${toHex2(y)}, jump=${jump}`, () => {
      const dir = 0x42;
      const acBase = 0xAA;
      const rela = -0x10 & 0xFF;
      clearIRAM();
      putCode(0x100, 0xD5);       // DJNZ dir,rela
      putCode(0x101, dir, false);
      putCode(0x102, rela, false);
      cpu.PSW = 0;
      cpu.ACC = acBase;
      cpu.iram[dir] = x;

      cpu.run1(0x100);              // DJNZ dir,rela
      expect(cpu.PC).toBe(jump ? 0x103 + toSigned(rela) : 0x103);
      expect(cpu.ACC).toBe(acBase);
      expect(cpu.iram[dir]).toBe(y);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`DJNZ R3,rel R3=${toHex2(y)}, jump=${jump}`, () => {
      const acBase = 0xAA;
      const rela = -0x10 & 0xFF;
      clearIRAM();
      putCode(0x100, 0xDB);       // DJNZ R3,rela
      putCode(0x101, rela, false);
      cpu.PSW = 0;
      cpu.ACC = acBase;
      cpu.iram[3] = x;

      cpu.run1(0x100);              // DJNZ R3,rela
      expect(cpu.PC).toBe(jump ? 0x102 + toSigned(rela) : 0x102);
      expect(cpu.iram[3]).toBe(y);
      expect(cpu.ACC).toBe(acBase);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
  });


//////////// JB ////////////
test(`op:JB bit,rel bit=0`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x20);       // JB bit,rela
  putCode(0x101, bit, false);
  putCode(0x102, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;
  cpu.setBIT(bit, 0);

  cpu.run1(0x100);              // JB bit,rela
  expect(cpu.PC).toBe(0x103);
  expect(cpu.getBIT(bit)).toBe(0);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`op:JB bit,rel bit=1`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x20);       // JB bit,rela
  putCode(0x101, bit, false);
  putCode(0x102, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;
  cpu.setBIT(bit, 1);

  cpu.run1(0x100);              // JB bit,rela
  expect(cpu.PC).toBe(0x103 + toSigned(rela));
  expect(cpu.getBIT(bit)).toBe(1);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JBC ////////////
test(`op:JBC bit,rel bit=0`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x10);       // JBC bit,rela
  putCode(0x101, bit, false);
  putCode(0x102, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;
  cpu.setBIT(bit, 0);

  cpu.run1(0x100);              // JBC bit,rela
  expect(cpu.PC).toBe(0x103);
  expect(cpu.getBIT(bit)).toBe(0);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`op:JBC bit,rel bit=1`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x10);       // JBC bit,rela
  putCode(0x101, bit, false);
  putCode(0x102, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;
  cpu.setBIT(bit, 1);

  cpu.run1(0x100);              // JBC bit,rela
  expect(cpu.PC).toBe(0x103 + toSigned(rela));
  expect(cpu.getBIT(bit)).toBe(0);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JNB ////////////
test(`op:JNB bit,rel bit=0`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x30);       // JNB bit,rela
  putCode(0x101, bit, false);
  putCode(0x102, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;
  cpu.setBIT(bit, 0);

  cpu.run1(0x100);              // JNB bit,rela
  expect(cpu.PC).toBe(0x103 + toSigned(rela));
  expect(cpu.getBIT(bit)).toBe(0);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`op:JNB bit,rel bit=1`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x30);       // JNB bit,rela
  putCode(0x101, bit, false);
  putCode(0x102, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;
  cpu.setBIT(bit, 1);

  cpu.run1(0x100);              // JNB bit,rela
  expect(cpu.PC).toBe(0x103);
  expect(cpu.getBIT(bit)).toBe(1);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JC ////////////
test(`op:JC rel CY=0`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x40);       // JC rela
  putCode(0x101, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;
  cpu.CY = 0;

  cpu.run1(0x100);              // JC rela
  expect(cpu.PC).toBe(0x102);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`op:JC rel CY=1`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x40);       // JC rela
  putCode(0x102, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;
  cpu.CY = 1;

  cpu.run1(0x100);              // JC rela
  expect(cpu.PC).toBe(0x102 + toSigned(rela));
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(1);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JNC ////////////
test(`op:JNC rel CY=0`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x50);       // JNC rela
  putCode(0x101, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;
  cpu.CY = 0;

  cpu.run1(0x100);              // JNC rela
  expect(cpu.PC).toBe(0x102 + toSigned(rela));
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`op:JNC rel CY=1`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x50);       // JNC rela
  putCode(0x102, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;
  cpu.CY = 1;

  cpu.run1(0x100);              // JNC rela
  expect(cpu.PC).toBe(0x102);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(1);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JZ ////////////
test(`op:JZ rel AC=55`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x60);       // JZ rela
  putCode(0x101, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;

  cpu.run1(0x100);              // JZ rela
  expect(cpu.PC).toBe(0x102);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`op:JZ rel AC=00`, () => {
  const acBase = 0x00;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x60);       // JZ rela
  putCode(0x102, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;

  cpu.run1(0x100);              // JZ rela
  expect(cpu.PC).toBe(0x102 + toSigned(rela));
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JNZ ////////////
test(`op:JNZ rel AC=55`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x70);       // JNZ rela
  putCode(0x101, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;

  cpu.run1(0x100);              // JNZ rela
  expect(cpu.PC).toBe(0x102 + toSigned(rela));
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`op:JNZ rel AC=00`, () => {
  const acBase = 0x00;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  putCode(0x100, 0x70);       // JNZ rela
  putCode(0x102, rela, false);
  cpu.PSW = 0;
  cpu.ACC = acBase;

  cpu.run1(0x100);              // JNZ rela
  expect(cpu.PC).toBe(0x102);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JMP @A+DPTR ////////////
describe.each([
  // A    DPTR   newPC
  [0x02, 0x1234, 0x1236],
  [0x00, 0x4321, 0x4321],
  [0x02, 0x8001, 0x8003],
  [0xFF, 0x8001, 0x8100],
  [0xFF, 0xFF55, 0x0054],
]) ('op:JMP @A+DPTR',
  (a, dptr, newPC)  => {
    test(`JMP @A+DPTR`, () => {
      clearIRAM();
      putCode(0x100, 0x73);       // JMP @A+DPTR
      cpu.PSW = 0;
      cpu.ACC = a;
      cpu.DPTR = dptr;

      cpu.run1(0x100);              // JMP @A+DPTR
      expect(cpu.PC).toBe(newPC);
      expect(cpu.ACC).toBe(a);
      expect(cpu.DPTR).toBe(dptr);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
  });


//////////// MOV ////////////
describe('op:MOV', () => {

  test(`A,dir`, () => {
    const v = 0x43;
    const dir = 0x42;
    clearIRAM();
    putCode(0x1000, 0xE5);        // MOV A,dir
    putCode(0x1001, dir, false);
    cpu.ACC = 0xAA;
    cpu.PSW = 0;
    cpu.iram[dir] = v;

    cpu.run1(0x1000);               // MOV
    expect(cpu.PC).toBe(0x1002);
    expect(cpu.PSW).toBe(0);
    expect(cpu.ACC).toBe(v);
    expect(cpu.iram[dir]).toBe(v);
  });

  test(`A,dir (SFR)`, () => {
    const v = 0x43;
    const dir = 0xD0;           // PSW
    clearIRAM();
    putCode(0x1000, 0xE5);        // MOV A,dir
    putCode(0x1001, dir, false);
    cpu.ACC = 0xAA;
    cpu.PSW = v;

    cpu.run1(0x1000);               // MOV
    expect(cpu.PC).toBe(0x1002);
    expect(cpu.PSW).toBe(v);
    expect(cpu.iram[dir]).toBe(v);
    expect(cpu.ACC).toBe(v);
  });

  test(`dir,A (SFR)`, () => {
    const v = 0x47;
    const notV = v ^ 0xFF;
    const dir = 0x83;           // DPH
    clearIRAM();
    putCode(0x1000, 0xF5);        // MOV dir,A
    putCode(0x1001, dir, false);
    cpu.ACC = 0xAA;
    cpu.PSW = 0;
    cpu.DPH = notV;
    expect(cpu.iram[dir]).toBe(notV);

    cpu.run1(0x1000);               // MOV
    expect(cpu.PC).toBe(0x1002);
    expect(cpu.PSW).toBe(0);
    expect(cpu.ACC).toBe(v);
    expect(cpu.DPH).toBe(v);
    expect(cpu.iram[dir]).toBe(v);
  });

  test(`dir,dir`, () => {
    const v = 0x47;
    const notV = v ^ 0xFF;
    const ddir = 0x43;
    const sdir = 0x71;
    clearIRAM();
    putCode(0x1000, 0x85);        // MOV dir,A
    putCode(0x1001, ddir, false);        // Destination address
    putCode(0x1002, sdir, false);        // Source address
    cpu.ACC = notV;
    cpu.PSW = 0;
    cpu.iram[ddir] = notV;
    expect(cpu.iram[ddir]).toBe(notV);
    cpu.iram[sdir] = v;
    expect(cpu.iram[sdir]).toBe(v);

    cpu.run1(0x1000);               // MOV
    expect(cpu.PC).toBe(0x1003);
    expect(cpu.PSW).toBe(0);
    expect(cpu.ACC).toBe(notV);
    expect(cpu.iram[sdir]).toBe(v);
    expect(cpu.iram[ddir]).toBe(v);
  });

  test(`A,dir (SFR)`, () => {
    const v = 0x43;
    const notV = v ^ 0xFF;
    const dir = 0xD0;           // PSW
    clearIRAM();
    putCode(0x1000, 0xE5);        // MOV A,dir
    putCode(0x1001, dir, false);
    cpu.ACC = notV;
    expect(cpu.iram[0xE0]).toBe(notV); // ACC
    cpu.PSW = v;
    expect(cpu.iram[dir]).toBe(v); // PSW

    cpu.run1(0x1000);               // MOV
    expect(cpu.PC).toBe(0x1002);
    expect(cpu.PSW).toBe(v);
    expect(cpu.iram[dir]).toBe(v);
    expect(cpu.ACC).toBe(v);
  });

  _.range(0,2).forEach(r => {
    test(`A,@R1`, () => {
      const v = 0x43;
      const dir = 0x42;
      clearIRAM();
      putCode(0x1000, 0xE6 | r);        // MOV A,@Rr
      cpu.ACC = 0xAA;
      cpu.PSW = 0;
      cpu.iram[r] = dir;
      cpu.iram[dir] = v;

      cpu.run1(0x1000);               // MOV
      expect(cpu.PC).toBe(0x1001);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(v);
      expect(cpu.iram[dir]).toBe(v);
      expect(cpu.iram[r]).toBe(dir);
    });

    test(`@R1,#imm`, () => {
      const v = 0x43;
      const notV = v ^ 0xFF;
      const dir = 0x42;
      clearIRAM();
      putCode(0x1000, 0x76 | r);        // MOV @Rr,#imm
      cpu.code[0x1001] = v;             // #imm
      cpu.ACC = notV;
      cpu.PSW = 0;
      cpu.iram[r] = dir;
      cpu.iram[dir] = notV;

      cpu.run1(0x1000);               // MOV
      expect(cpu.PC).toBe(0x1002);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(notV);
      expect(cpu.iram[dir]).toBe(v);
      expect(cpu.iram[r]).toBe(dir);
    });

    test(`dir,@R${r}`, () => {
      const v = 0x43;
      const notV = v ^ 0xFF;
      const rdir = 0x42;
      const ddir = 0x71;
      clearIRAM();
      putCode(0x1000, 0x86 | r);        // MOV dir,@Rr
      putCode(0x1001, ddir, false);
      cpu.ACC = notV;
      cpu.PSW = 0;
      cpu.iram[r] = rdir;
      cpu.iram[rdir] = v;
      cpu.iram[ddir] = notV;

      cpu.run1(0x1000);               // MOV
      expect(cpu.PC).toBe(0x1002);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(notV);
      expect(cpu.iram[rdir]).toBe(v);
      expect(cpu.iram[ddir]).toBe(v);
      expect(cpu.iram[r]).toBe(rdir);
    });
  });

  test(`dir,#imm`, () => {
    const v = 0x43;
    const notV = v ^ 0xFF;
    const dir = 0x42;
    clearIRAM();
    putCode(0x1000, 0x75);        // MOV dir,#imm
    putCode(0x1001, dir, false);       // dir
    putCode(0x1002, v, false);         // #imm
    cpu.ACC = notV;
    cpu.PSW = 0;
    cpu.iram[dir] = notV;

    cpu.run1(0x1000);               // MOV
    expect(cpu.PC).toBe(0x1003);
    expect(cpu.PSW).toBe(0);
    expect(cpu.ACC).toBe(notV);
    expect(cpu.iram[dir]).toBe(v);
  });

  test(`A,#imm`, () => {
    const v = 0x43;
    clearIRAM();
    putCode(0x1000, 0x74);        // MOV A,#imm
    putCode(0x1001, v, false);
    cpu.ACC = 0xAA;
    cpu.PSW = 0;

    cpu.run1(0x1000);               // MOV
    expect(cpu.PC).toBe(0x1002);
    expect(cpu.PSW).toBe(0);
    expect(cpu.ACC).toBe(v);
  });

  _.range(0,8).forEach(r => {
    test(`A,R${r}`, () => {
      const v = 0x43;
      clearIRAM();
      putCode(0x1000, 0xE8 | r);        // MOV A,Rr
      cpu.ACC = 0xAA;
      cpu.PSW = 0;
      cpu.iram[r] = v;

      cpu.run1(0x1000);               // MOV
      expect(cpu.PC).toBe(0x1001);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(v);
      expect(cpu.iram[r]).toBe(v);
    });

    test(`R${r},A`, () => {
      const v = 0x43;
      clearIRAM();
      putCode(0x1000, 0xF8 | r);        // MOV Rr,A
      cpu.ACC = v;
      cpu.PSW = 0;
      cpu.iram[r] = 0xAA;

      cpu.run1(0x1000);               // MOV
      expect(cpu.PC).toBe(0x1001);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(v);
      expect(cpu.iram[r]).toBe(v);
    });

    test(`R${r},dir`, () => {
      const v = 0x43;
      const dir = 0x42;
      clearIRAM();
      putCode(0x1000, 0xA8 | r);        // MOV Rr,dir
      putCode(0x1001, dir, false);
      cpu.ACC = 0xAA;
      cpu.PSW = 0;
      cpu.iram[dir] = v;
      cpu.iram[r] = 0x42;

      cpu.run1(0x1000);               // MOV
      expect(cpu.PC).toBe(0x1002);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(0xAA);
      expect(cpu.iram[dir]).toBe(v);
      expect(cpu.iram[r]).toBe(v);
    });

    test(`R${r},#imm`, () => {
      const v = 0x43;
      clearIRAM();
      putCode(0x1000, 0x78 | r);        // MOV Rr,#imm
      putCode(0x1001, v, false);
      cpu.ACC = 0xAA;
      cpu.PSW = 0;
      cpu.iram[r] = 0x42;

      cpu.run1(0x1000);               // MOV
      expect(cpu.PC).toBe(0x1002);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(0xAA);
      expect(cpu.iram[r]).toBe(v);
    });

    test(`dir,R${r}`, () => {
      const v = 0x43;
      const notV = v ^ 0xFF;
      const dir = 0x72
      clearIRAM();
      putCode(0x1000, 0x88 | r);        // MOV dir,Rr
      putCode(0x1001, dir, false);
      cpu.ACC = notV;
      cpu.PSW = 0;
      cpu.iram[r] = v;
      cpu.iram[dir] = notV;

      cpu.run1(0x1000);               // MOV
      expect(cpu.PC).toBe(0x1002);
      expect(cpu.PSW).toBe(0);
      expect(cpu.ACC).toBe(notV);
      expect(cpu.iram[r]).toBe(v);
      expect(cpu.iram[dir]).toBe(v);
    });
  });
});


//////////// MOV bit ////////////
test(`op:MOV C,sbit=0`, () => {
  const bit = 0x42;
  clearIRAM();
  putCode(0x100, 0xA2);       // MOV C,sbit
  putCode(0x101, bit, false);
  cpu.PSW = 0;
  cpu.ACC = 0xAA;
  cpu.CY = 0;
  cpu.setBIT(bit, 0);

  cpu.run1(0x100);              // MOV
  expect(cpu.PC).toBe(0x102);
  expect(cpu.ACC).toBe(0xAA);
  expect(cpu.getBIT(bit)).toBe(0);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`op:MOV C,sbit=1`, () => {
  const bit = 0x42;
  clearIRAM();
  putCode(0x100, 0x92);       // MOV dbit,C
  putCode(0x101, bit, false);
  cpu.PSW = 0;
  cpu.ACC = 0xAA;
  cpu.CY = 1;
  cpu.setBIT(bit, 0);

  cpu.run1(0x100);              // MOV
  expect(cpu.PC).toBe(0x102);
  expect(cpu.ACC).toBe(0xAA);
  expect(cpu.getBIT(bit)).toBe(1);
  expect(cpu.CY).toBe(1);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////////// MOV DPTR,#imm16 ////////////////
test(`op:MOV DPTR,#data16`, () => {
  const d = 0x1234;
  clearIRAM();
  putCode(0x100, 0x90);       // MOV DPTR,#imm
  putCode(0x101, d >>> 8, false);
  putCode(0x102, d & 0xFF, false);
  cpu.PSW = 0;
  cpu.ACC = 0xAA;
  cpu.DPTR = 0x9977;

  cpu.run1(0x100);              // MOV
  expect(cpu.PC).toBe(0x103);
  expect(cpu.DPTR).toBe(d);
  expect(cpu.ACC).toBe(0xAA);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// MOVC A,@A+DPTR ////////////
describe.each([
  // a      y   entAddr newA
  [0x72, 0x1234, 0x12A6, 0x73],
  [0x33, 0x4321, 0x4354, 0x96],
  [0x12, 0x8001, 0x8013, 0x23],
  [0xFF, 0x8001, 0x8100, 0x17],
  [0xF3, 0xFF55, 0x0048, 0x87],
]) ('op:MOVC',
  (a, y, entAddr, newA)  => {
    test(`A,@A+DPTR a=${toHex2(a)},dptr=${toHex4(y)},entAddr=${toHex4(entAddr)},newA=${toHex2(newA)} `, () => {
      clearCode();
      clearIRAM();
      putCode(0x100, 0x93);       // MOVC A,@A+DPTR
      cpu.PSW = 0;
      cpu.ACC = a;
      cpu.DPTR = y;
      putCode(entAddr, newA, false);

      cpu.run1(0x100);              // MOVC
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(newA);
      expect(cpu.code[entAddr]).toBe(newA);
      expect(cpu.DPTR).toBe(y);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`A,@A+PC a=${toHex2(a)},pc=${toHex4(y)},entAddr=${toHex4(entAddr)},newA=${toHex2(newA)} `, () => {
      clearCode();
      clearIRAM();
      putCode(y - 1, 0x83);     // MOVC A,@A+PC
      cpu.PSW = 0;
      cpu.ACC = a;
      cpu.DPTR = 0x1111;
      putCode(entAddr, newA, false);

      cpu.run1(y-1);              // MOVC
      expect(cpu.PC).toBe(y);
      expect(cpu.ACC).toBe(newA);
      expect(cpu.code[entAddr]).toBe(newA);
      expect(cpu.DPTR).toBe(0x1111);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
  });


//////////// MOVX ////////////
describe.each([
  // addr    v
  [0x12A6, 0x73],
  [0x4354, 0x96],
  [0x8013, 0x23],
  [0x8100, 0x17],
  [0x0048, 0x87],
]) ('op:MOVX',
  (addr, v)  => {
    test(`A,@R1 addr=${toHex4(addr)},v=${toHex2(v)} `, () => {
      clearCode();
      clearIRAM();
      clearXRAM();
      putCode(0x100, 0xE3);       // MOVX A,@R1
      cpu.PSW = 0;
      cpu.ACC = 0x99;
      cpu.P2 = addr >>> 8;
      cpu.iram[1] = addr & 0xFF;
      cpu.xram[addr] = v;

      cpu.run1(0x100);              // MOVX
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(v);
      expect(cpu.P2).toBe(addr >>> 8);
      expect(cpu.iram[1]).toBe(addr & 0xFF);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`A,@DPTR addr=${toHex4(addr)},v=${toHex2(v)} `, () => {
      clearCode();
      clearIRAM();
      clearXRAM();
      putCode(0x100, 0xE0);       // MOVX A,@DPTR
      cpu.PSW = 0;
      cpu.ACC = 0x99;
      cpu.DPTR = addr;
      cpu.xram[addr] = v;

      cpu.run1(0x100);              // MOVX
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(v);
      expect(cpu.DPTR).toBe(addr);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`@R1,A addr=${toHex4(addr)},v=${toHex2(v)} `, () => {
      clearCode();
      clearIRAM();
      clearXRAM();
      putCode(0x100, 0xF3);       // MOVX @R1,A
      cpu.PSW = 0;
      cpu.ACC = v;
      cpu.P2 = addr >>> 8;
      cpu.iram[1] = addr & 0xFF;
      cpu.xram[addr] = v;

      cpu.run1(0x100);              // MOVX
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(v);
      expect(cpu.P2).toBe(addr >>> 8);
      expect(cpu.iram[1]).toBe(addr & 0xFF);
      expect(cpu.xram[addr]).toBe(v);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`@DPTR,A addr=${toHex4(addr)},v=${toHex2(v)} `, () => {
      clearCode();
      clearIRAM();
      clearXRAM();
      putCode(0x100, 0xF0);       // MOVX @DPTR,A
      cpu.PSW = 0;
      cpu.ACC = v;
      cpu.DPTR = addr;
      cpu.xram[addr] = 0xBB;

      cpu.run1(0x100);              // MOVX
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(v);
      expect(cpu.DPTR).toBe(addr);
      expect(cpu.xram[addr]).toBe(v);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
  });


//////////// CLR A ////////////
test('op:CLR A', () => {
  clearIRAM();
  putCode(0x100, 0xE4);       // CLR A
  cpu.ACC = 0x42;
  cpu.PSW = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.ACC).toBe(0);
});

//////////// CLR bit ////////////
test('op:CLR bit', () => {
  const bit = 0x42;
  const acBase = 0xAA;
  clearIRAM();
  putCode(0x100, 0xC2);       // CLR bit
  putCode(0x101, bit, false);
  cpu.setBIT(bit, 1);
  cpu.ACC = acBase;
  cpu.PSW = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x102);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.getBIT(bit)).toBe(0);
});

//////////// CLR C ////////////
test('op:CLR C', () => {
  clearIRAM();
  putCode(0x100, 0xC3);       // CLR C
  cpu.ACC = 0x42;
  cpu.PSW = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
});


//////////// SETB bit ////////////
test('op:SETB bit', () => {
  const bit = 0x42;
  const acBase = 0xAA;
  clearIRAM();
  putCode(0x100, 0xD2);       // SETB bit
  putCode(0x101, bit, false);
  cpu.setBIT(bit, 0);
  cpu.ACC = acBase;
  cpu.PSW = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x102);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.getBIT(bit)).toBe(1);
});

//////////// SETB C ////////////
test('op:SETB C', () => {
  clearIRAM();
  putCode(0x100, 0xD3);       // SETB C
  cpu.ACC = 0x42;
  cpu.PSW = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.AC).toBe(0);
});



//////////// CPL A ////////////
test('op:CPL A', () => {
  const acBase = 0x42;
  clearIRAM();
  putCode(0x100, 0xF4);       // CPL A
  cpu.ACC = acBase;
  cpu.PSW = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.ACC).toBe(acBase ^ 0xFF);
});

//////////// CPL bit ////////////
test('op:CPL bit=1', () => {
  const bit = 0x42;
  const acBase = 0xAA;
  clearIRAM();
  putCode(0x100, 0xB2);       // CPL bit
  putCode(0x101, bit, false);
  cpu.setBIT(bit, 1);
  cpu.ACC = acBase;
  cpu.PSW = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x102);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.getBIT(bit)).toBe(0);
});

//////////// CPL bit ////////////
test('op:CPL bit=0', () => {
  const bit = 0x42;
  const acBase = 0xAA;
  clearIRAM();
  putCode(0x100, 0xB2);       // CPL bit
  putCode(0x101, bit, false);
  cpu.setBIT(bit, 0);
  cpu.ACC = acBase;
  cpu.PSW = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x102);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.ACC).toBe(acBase);
  expect(cpu.getBIT(bit)).toBe(1);
});

//////////// CPL C ////////////
test('op:CPL C=0', () => {
  const acBase = 0x42;
  clearIRAM();
  putCode(0x100, 0xB3);       // CPL C
  cpu.ACC = 0x42;
  cpu.PSW = 0;
  cpu.CY = 0;
  cpu.ACC = acBase;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.AC).toBe(0);
  expect(cpu.ACC).toBe(acBase);
});

//////////// CPL C ////////////
test('op:CPL C=1', () => {
  clearIRAM();
  putCode(0x100, 0xB3);       // CPL C
  cpu.ACC = 0x42;
  cpu.PSW = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
});


//////////// DEC ////////////
describe.each([
  // x    dec
  [0x00, 0xFF],
  [0x01, 0x00],
  [0x80, 0x7F],
  [0xFF, 0xFE],
  [0xFE, 0xFD],
]) ('op:DEC',
  (x, dec)  => {
    test(`DEC A A=${toHex2(x)}, result=${toHex2(dec)}`, () => {
      clearIRAM();
      putCode(0x100, 0x14);       // DEC A
      cpu.PSW = 0;
      cpu.ACC = x;

      cpu.run1(0x100);              // DEC A
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(dec);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    _.range(0,8).forEach(r => test(`DEC R${r}, R${r}=${toHex2(x)} result=${toHex2(dec)}`, () => {
      clearIRAM();
      putCode(0x100, 0x18 | r);       // DEC Rr
      cpu.PSW = 0;
      cpu.iram[r] = x;

      cpu.run1(0x100);              // DEC Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.iram[r]).toBe(dec);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    }));

    test(`DEC dir, dir=${toHex2(x)} result=${toHex2(dec)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x15);       // DEC dir
      putCode(0x101, dir, false);
      cpu.PSW = 0;
      cpu.iram[dir] = x;

      cpu.run1(0x100);              // DEC dir
      expect(cpu.PC).toBe(0x102);
      expect(cpu.iram[dir]).toBe(dec);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    _.range(0,2).forEach(r => test(`DEC @R$[r} x=${toHex2(x)}, result=${toHex2(dec)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x16 | r);       // DEC @Rr
      cpu.PSW = 0;
      cpu.iram[dir] = x;
      cpu.iram[r] = dir;            // Rr

      cpu.run1(0x100);              // DEC @Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.iram[r]).toBe(dir);
      expect(cpu.iram[dir]).toBe(dec);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    }));
  });


//////////// MUL AB ////////////
describe.each([
  // x     y   prodB prodA ov
  [0x00, 0x00, 0x00, 0x00,  0],
  [0x00, 0x72, 0x00, 0x00,  0],
  [0x50, 0xA0, 0x32, 0x00,  1],
  [0x12, 0x34, 0x03, 0xA8,  1],
  [0xFF, 0x71, 0x70, 0x8F,  1],
  [0xFF, 0xFF, 0xFE, 0x01,  1],
  [0xFF, 0x00, 0x00, 0x00,  0],
  [0x00, 0xFF, 0x00, 0x00,  0],
  [0xFF, 0x01, 0x00, 0xFF,  0],
  [0x01, 0xFF, 0x00, 0xFF,  0],
  [0xFF, 0x02, 0x01, 0xFE,  1],
  [0x02, 0xFF, 0x01, 0xFE,  1],
]) ('op:MUL AB',
  (x, y, prodB, prodA, ov)  => {
    test(`A=${toHex2(x)},B=${toHex2(y)}, prodA=${toHex2(prodA)},prodB=${toHex2(prodB)},ov=${ov}`, () => {
      clearIRAM();
      putCode(0x100, 0xA4);       // MUL AB
      cpu.PSW = 0;
      cpu.ACC = x;
      cpu.B = y;
      cpu.CY = 1;
      cpu.OV = 0;
      cpu.AC = 1;

      cpu.run1(0x100);              // MUL AB
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(prodA);
      expect(cpu.B).toBe(prodB);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(1);
      expect(cpu.OV).toBe(ov);
    });
  });


//////////// DIV AB ////////////
describe.each([
  // x     y    div   rem ov
  [0x00, 0x00, 0x00, 0x00, 1],
  [0x00, 0x01, 0x00, 0x00, 0],
  [0x10, 0x02, 0x08, 0x00, 0],
  [0x11, 0x02, 0x08, 0x01, 0],
  [0x12, 0x02, 0x09, 0x00, 0],
  [0x12, 0x13, 0x00, 0x12, 0],
  [0x12, 0x00, 0x00, 0x00, 1],
  [0x00, 0x00, 0x00, 0x00, 1],
]) ('op:DIV AB',
  (x, y, div, rem, ov)  => {
    test(`A=${toHex2(x)}, B=${toHex2(y)}, div=${toHex2(div)} rem=${toHex2(rem)}, ov=${ov}`, () => {
      clearIRAM();
      putCode(0x100, 0x84);       // DIV AB
      cpu.PSW = 0;
      cpu.ACC = x;
      cpu.B = y;
      cpu.CY = 1;
      cpu.OV = 0;
      cpu.AC = 1;

      cpu.run1(0x100);              // DIV AB
      expect(cpu.PC).toBe(0x101);

      if (!ov) {
        expect(cpu.ACC).toBe(div);
        expect(cpu.B).toBe(rem);
      }

      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(1);
      expect(cpu.OV).toBe(ov);
    });
  });


//////////// INC ////////////
describe.each([
  // x    inc
  [0xFF, 0x00],
  [0x00, 0x01],
  [0x7F, 0x80],
  [0xFE, 0xFF],
  [0xFD, 0xFE],
]) ('op:INC',
  (x, inc)  => {
    test(`A A=${toHex2(x)}, result=${toHex2(inc)}`, () => {
      clearIRAM();
      putCode(0x100, 0x04);       // INC A
      cpu.PSW = 0;
      cpu.ACC = x;

      cpu.run1(0x100);              // INC A
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(inc);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    _.range(0,8).forEach(r => test(`R${r}, R${r}=${toHex2(x)} result=${toHex2(inc)}`, () => {
      clearIRAM();
      putCode(0x100, 0x08 | r);       // INC Rr
      cpu.PSW = 0;
      cpu.iram[r] = x;

      cpu.run1(0x100);              // INC R3
      expect(cpu.PC).toBe(0x101);
      expect(cpu.iram[r]).toBe(inc);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    }));

    test(`dir, dir=${toHex2(x)} result=${toHex2(inc)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x05);       // INC dir
      putCode(0x101, dir, false);
      cpu.PSW = 0;
      cpu.iram[dir] = x;

      cpu.run1(0x100);              // INC dir
      expect(cpu.PC).toBe(0x102);
      expect(cpu.iram[dir]).toBe(inc);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    _.range(0,2).forEach(r => test(`@R${r} x=${toHex2(x)}, result=${toHex2(inc)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x06 | r);       // INC @Rr
      cpu.PSW = 0;
      cpu.iram[dir] = x;
      cpu.iram[r] = dir;            // Rr

      cpu.run1(0x100);              // INC @Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.iram[r]).toBe(dir);
      expect(cpu.iram[dir]).toBe(inc);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    }));
  });


//////////// INC DPTR ////////////
describe.each([
  // x    inc
  [0xFFFF, 0x0000],
  [0xFF00, 0xFF01],
  [0x0000, 0x0001],
  [0x7FFF, 0x8000],
  [0x00FE, 0x00FF],
  [0x00FF, 0x0100],
  [0x00FD, 0x00FE],
]) ('op:INC DPTR',
  (x, inc)  => {
    test(`DPTR=${toHex2(x)}, result=${toHex2(inc)}`, () => {
      const acBase = 0xAA;
      clearIRAM();
      putCode(0x100, 0xA3);       // INC DPTR
      cpu.PSW = 0;
      cpu.ACC = acBase;
      cpu.DPTR = x;

      cpu.run1(0x100);              // INC DPTR
      expect(cpu.PC).toBe(0x101);
      expect(cpu.DPTR).toBe(inc);
      expect(cpu.ACC).toBe(acBase);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
  });


//////////// RL ////////////
test('op:RL A=0x80,CY=0 = A=01,CY=0', () => {
  clearIRAM();
  putCode(0x100, 0x23);       // RL A
  cpu.ACC = 0x80;
  cpu.PSW = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x01);
});

test('op:RL A=0x08,CY=0 = A=10,CY=0', () => {
  clearIRAM();
  putCode(0x100, 0x23);       // RL A
  cpu.ACC = 0x08;
  cpu.PSW = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x10);
});

test('op:RL A=0x80,CY=1 = A=01,CY=1', () => {
  clearIRAM();
  putCode(0x100, 0x23);       // RL A
  cpu.ACC = 0x80;
  cpu.PSW = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x01);
});

test('op:RL A=0x08,CY=1 = A=10,CY=1', () => {
  clearIRAM();
  putCode(0x100, 0x23);       // RL A
  cpu.ACC = 0x08;
  cpu.PSW = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x10);
});

test('op:RL CY=1 bit walk', () => {
  clearIRAM();
  putCode(0x100, 0x23);       // RL A
  cpu.ACC = 0x80;
  cpu.PSW = 0;
  cpu.CY = 1;

  for (let k = 0; k < 8; ++k) {
    cpu.run1(0x100);
    expect(cpu.PC).toBe(0x101);
    expect(cpu.CY).toBe(1);
    expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
    expect(cpu.ACC).toBe(0x01 << k);
  }

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x01);
});


//////////// RLC ////////////
test('op:RLC A=0x80,CY=0 = A=00,CY=1', () => {
  clearIRAM();
  putCode(0x100, 0x33);       // RLC A
  cpu.ACC = 0x80;
  cpu.PSW = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x00);
});

test('op:RLC A=0x08,CY=0 = A=10,CY=0', () => {
  clearIRAM();
  putCode(0x100, 0x33);       // RLC A
  cpu.ACC = 0x08;
  cpu.PSW = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x10);
});

test('op:RLC A=0x80,CY=1 = A=01,CY=1', () => {
  clearIRAM();
  putCode(0x100, 0x33);       // RLC A
  cpu.ACC = 0x80;
  cpu.PSW = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x01);
});

test('op:RLC A=0x08,CY=1 = A=11,CY=0', () => {
  clearIRAM();
  putCode(0x100, 0x33);       // RLC A
  cpu.ACC = 0x08;
  cpu.PSW = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x11);
});

test('op:RLC CY=1 bit walk', () => {
  clearIRAM();
  putCode(0x100, 0x33);       // RLC A
  cpu.ACC = 0x00;
  cpu.PSW = 0;
  cpu.CY = 1;

  for (let k = 0; k < 8; ++k) {
    cpu.run1(0x100);
    expect(cpu.PC).toBe(0x101);
    expect(cpu.CY).toBe(0);
    expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
    expect(cpu.ACC).toBe(0x01 << k);
  }

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x00);
});


//////////// RR ////////////
test('op:RR A=0x01,CY=0 = A=80,CY=0', () => {
  clearIRAM();
  putCode(0x100, 0x03);       // RR A
  cpu.ACC = 0x01;
  cpu.PSW = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x80);
});

test('op:RR A=0x08,CY=0 = A=04,CY=0', () => {
  clearIRAM();
  putCode(0x100, 0x03);       // RR A
  cpu.ACC = 0x08;
  cpu.PSW = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x04);
});

test('op:RR A=0x80,CY=1 = A=40,CY=1', () => {
  clearIRAM();
  putCode(0x100, 0x03);       // RR A
  cpu.ACC = 0x80;
  cpu.PSW = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x40);
});

test('op:RR A=0x08,CY=1 = A=04,CY=1', () => {
  clearIRAM();
  putCode(0x100, 0x03);       // RR A
  cpu.ACC = 0x08;
  cpu.PSW = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x04);
});

test('op:RR CY=1 bit walk', () => {
  clearIRAM();
  putCode(0x100, 0x03);       // RR A
  cpu.ACC = 0x01;
  cpu.PSW = 0;
  cpu.CY = 1;

  for (let k = 0; k < 8; ++k) {
    cpu.run1(0x100);
    expect(cpu.PC).toBe(0x101);
    expect(cpu.CY).toBe(1);
    expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
    expect(cpu.ACC).toBe(0x80 >>> k);
  }

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x80);
});


//////////// RRC ////////////
test('op:RRC A=0x01,CY=0 = A=00,CY=1', () => {
  clearIRAM();
  putCode(0x100, 0x13);       // RRC A
  cpu.ACC = 0x01;
  cpu.PSW = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x00);
});

test('op:RRC A=0x08,CY=0 = A=04,CY=0', () => {
  clearIRAM();
  putCode(0x100, 0x13);       // RRC A
  cpu.ACC = 0x08;
  cpu.PSW = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x04);
});

test('op:RRC A=0x80,CY=1 = A=C0,CY=0', () => {
  clearIRAM();
  putCode(0x100, 0x13);       // RRC A
  cpu.ACC = 0x80;
  cpu.PSW = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0xC0);
});

test('op:RRC A=0x08,CY=1 = A=84,CY=0', () => {
  clearIRAM();
  putCode(0x100, 0x13);       // RRC A
  cpu.ACC = 0x08;
  cpu.PSW = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x84);
});

test('op:RRC CY=1 bit walk', () => {
  clearIRAM();
  putCode(0x100, 0x13);       // RRC A
  cpu.ACC = 0x00;
  cpu.PSW = 0;
  cpu.CY = 1;

  for (let k = 0; k < 8; ++k) {
    cpu.run1(0x100);
    expect(cpu.PC).toBe(0x101);
    expect(cpu.CY).toBe(0);
    expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
    expect(cpu.ACC).toBe(0x80 >>> k);
  }

  cpu.run1(0x100);
  expect(cpu.PC).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.PSW & ~cpu.PSW.cyMask).toBe(0);
  expect(cpu.ACC).toBe(0x00);
});


//////////////// ADD ////////////////
describe.each([
  // inCY  x     y    sum  addCY addAC
  [   0, 0x00, 0x00, 0x00,  0,    0],
  [   1, 0x00, 0x00, 0x00,  0,    0],
  [   0, 0x02, 0x02, 0x04,  0,    0],
  [   0, 0x64, 0x42, 0xA6,  0,    0],
  [   0, 0x37, 0x41, 0x78,  0,    0],
  [   0, 0x57, 0x74, 0xCB,  0,    0],
  [   0, 0x77, 0x47, 0xBE,  0,    0],
  [   0, 0x97, 0x97, 0x2E,  1,    0],
  [   0, 0x99, 0x99, 0x32,  1,    1],
  [   1, 0x99, 0x99, 0x32,  1,    1],
  [   0, 0x88, 0x77, 0xFF,  0,    0],
  [   1, 0x88, 0x77, 0xFF,  0,    0],
  [   0, 0x08, 0x08, 0x10,  0,    1],
]) (
  'op:ADD',
  (inCY, x, y, addSum, addCY, addAC)  => {
    test(`A,dir ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x25);       // ADD A,dir
      putCode(0x101, dir, false);

      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADD A,dir
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[dir]).toBe(x);
    });

    _.range(0,8).forEach(r => test(`A,R${r} ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`, () => {
      clearIRAM();
      cpu.PSW = 0;
      putCode(0x100, 0x28 | r);       // ADD A,Rr
      cpu.iram[r] = x;              // Rr
      cpu.ACC = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADD A,Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[r]).toBe(x);
    }));

    _.range(0,2).forEach(r => test(`A,@R${r} ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x26 | r);       // ADD A,@Rr
      cpu.iram[r] = dir;            // Set Rr=dir for @Rr
      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADD A,@Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[r]).toBe(dir);
      expect(cpu.iram[dir]).toBe(x);
    }));

    test(`A,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`, () => {
      const imm = x;
      clearIRAM();
      putCode(0x100, 0x24);       // ADD A,#imm
      putCode(0x101, imm, false);

      cpu.PSW = 0;
      cpu.ACC = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADD A,#imm
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
    });
  });

//////////////// ADDC ////////////////
describe.each([
  // inCY  x     y    sum  addCY addAC
  [   0, 0x00, 0x00, 0x00,  0,    0],
  [   1, 0x00, 0x00, 0x01,  0,    0],
  [   0, 0x02, 0x02, 0x04,  0,    0],
  [   0, 0x64, 0x42, 0xA6,  0,    0],
  [   0, 0x37, 0x41, 0x78,  0,    0],
  [   0, 0x57, 0x74, 0xCB,  0,    0],
  [   0, 0x77, 0x47, 0xBE,  0,    0],
  [   0, 0x97, 0x97, 0x2E,  1,    0],
  [   0, 0x99, 0x99, 0x32,  1,    1],
  [   1, 0x99, 0x99, 0x33,  1,    1],
  [   0, 0x88, 0x77, 0xFF,  0,    0],
  [   1, 0x88, 0x77, 0x00,  1,    1],
  [   0, 0x08, 0x08, 0x10,  0,    1],
]) (
  'op:ADDC',
  (inCY, x, y, addSum, addCY, addAC)  => {
    test(`${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x35);       // ADDC A,dir
      putCode(0x101, dir, false);

      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADDC A,dir
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[dir]).toBe(x);
    });

    _.range(0,8).forEach(r => test(`A,R${r} ${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`, () => {
      clearIRAM();
      cpu.PSW = 0;
      putCode(0x100, 0x38 | r);       // ADDC A,Rr
      cpu.iram[r] = x;              // Rr
      cpu.ACC = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADDC A,Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[r]).toBe(x);
    }));

    _.range(0,2).forEach(r => test(`A,@R${r} ${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x36 | r);       // ADDC A,@Rr
      cpu.iram[r] = dir;            // Set Rr=dir for @Rr
      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADDC A,@Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[r]).toBe(dir);
      expect(cpu.iram[dir]).toBe(x);
    }));

    test(`ADDC A,#imm ${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`, () => {
      const imm = x;
      clearIRAM();
      putCode(0x100, 0x34);       // ADDC A,#imm
      putCode(0x101, imm, false);

      cpu.PSW = 0;
      cpu.ACC = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADDC A,#imm
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
    });
  });

//////////////// ADDC/DA ////////////////
describe.each([
  // inCY  x     y    sum  addCY addAC  daSum daCY
  [   0, 0x00, 0x00, 0x00,  0,    0,   0x00,  0],
  [   1, 0x00, 0x00, 0x01,  0,    0,   0x01,  0],
  [   0, 0x02, 0x02, 0x04,  0,    0,   0x04,  0],
  [   0, 0x64, 0x42, 0xA6,  0,    0,   0x06,  1],
  [   0, 0x37, 0x41, 0x78,  0,    0,   0x78,  0],
  [   0, 0x57, 0x74, 0xCB,  0,    0,   0x31,  1],
  [   0, 0x77, 0x47, 0xBE,  0,    0,   0x24,  1],
  [   0, 0x97, 0x97, 0x2E,  1,    0,   0x94,  1],
  [   0, 0x99, 0x99, 0x32,  1,    1,   0x98,  1],
  [   1, 0x99, 0x99, 0x33,  1,    1,   0x99,  1],
  [   0, 0x88, 0x77, 0xFF,  0,    0,   0x65,  1],
  [   1, 0x88, 0x77, 0x00,  1,    1,   0x66,  1],
  [   0, 0x08, 0x08, 0x10,  0,    1,   0x16,  0],
]) ('op:DA',
  (inCY, x, y, addSum, addCY, addAC, daSum, daCY)  => {

    test(`${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(daSum)},CY=${daCY}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x35);       // ADDC A,dir
      putCode(0x101, dir, false);
      putCode(0x102, 0xD4, false);       // DA A

      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;
      cpu.CY = inCY;

      cpu.run1(0x100);          // ADDC
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[dir]).toBe(x);

      cpu.run1(cpu.PC);         // DA
      expect(cpu.PC).toBe(0x103);
      expect(cpu.ACC).toBe(daSum);
      expect(cpu.CY).toBe(daCY);
      expect(cpu.iram[dir]).toBe(x);
    });
  });


//////////////// ANL ////////////////
describe.each([
  // x     y    and
  [0x00, 0x00, 0x00],
  [0xFF, 0x00, 0x00],
  [0xFF, 0xFF, 0xFF],
  [0x00, 0xFF, 0x00],
  [0x01, 0x05, 0x01],
  [0x02, 0x05, 0x00],
  [0x04, 0x05, 0x04],
  [0x08, 0x05, 0x00],
  [0x10, 0x05, 0x00],
  [0x20, 0x05, 0x00],
  [0x40, 0x05, 0x00],
  [0x80, 0x05, 0x00],
]) ('op:ANL',
  (x, y, and)  => {

    test(`A,dir 0x55 ${toHex2(x)}&${toHex2(y)}=${toHex2(and)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x55);       // ANL A,dir
      putCode(0x101, dir, false);

      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;

      cpu.run1(0x100);              // ANL A,dir
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[dir]).toBe(x);
    });

    _.range(0,8).forEach(r => test(`A,R${r} ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`, () => {
      cpu.PSW = 0;
      putCode(0x100, 0x58 | r);       // ANL A,Rr
      cpu.iram[r] = x;              // Rr
      cpu.ACC = y;

      cpu.run1(0x100);              // ANL A,Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[r]).toBe(x);
    }));

    _.range(0,2).forEach(r => test(`A,@R${r} 0x57 ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x56 | r);       // ANL A,@Rr
      cpu.iram[r] = dir;            // Set R1=dir for @Rr
      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;

      cpu.run1(0x100);              // ANL A,@Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[r]).toBe(dir);
      expect(cpu.iram[dir]).toBe(x);
    }));

    test(`A,#imm 0x54 ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`, () => {
      const imm = x;
      clearIRAM();
      putCode(0x100, 0x54);       // ANL A,#imm
      putCode(0x101, imm, false);

      cpu.PSW = 0;
      cpu.ACC = y;

      cpu.run1(0x100);              // ANL A,#imm
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });

    test(`dir,A 0x52 ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x52);       // ANL dir,A
      putCode(0x101, dir, false);

      cpu.PSW = 0;
      cpu.iram[dir] = x;
      cpu.ACC = y;

      cpu.run1(0x100);              // ANL dir,A
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(y);
      expect(cpu.iram[dir]).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });

    test(`ANL dir,#imm 0x53 ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`, () => {
      const dir = 0x42;
      const imm = x;
      clearIRAM();
      putCode(0x100, 0x53);       // ANL dir,#imm
      putCode(0x101, dir, false);
      putCode(0x102, imm, false);
      cpu.PSW = 0;
      cpu.ACC = 0xBA;
      cpu.iram[dir] = y;

      cpu.run1(0x100);              // ANL dir,#imm
      expect(cpu.PC).toBe(0x103);
      expect(cpu.ACC).toBe(0xBA);
      expect(cpu.iram[dir]).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });
  });


//////////////// ANL C,src ////////////////
describe.each([
  // x   y  and
  [  0,  0,  0],
  [  0,  1,  0],
  [  1,  0,  0],
  [  1,  1,  1],
]) ('op:ANL',
  (x, y, and)  => {
    test(`C,bit ${x}&${y}=${and}`, () => {
      const bit = 0x42;
      clearIRAM();
      putCode(0x100, 0x82);       // ANL C,bit
      putCode(0x101, bit, false);
      cpu.PSW = 0;

      cpu.setBIT(bit, y);
      cpu.ACC = 0;
      cpu.CY = x;

      cpu.run1(0x100);              // ANL C,bit
      expect(cpu.PC).toBe(0x102);
      expect(cpu.CY).toBe(and);
      expect(cpu.AC).toBe(0);
      expect(cpu.ACC).toBe(0);
      expect(cpu.getBIT(bit)).toBe(y);
    });
  });


//////////////// ANL C,/src ////////////////
describe.each([
  // x   y  and
  [  0,  0,  0],
  [  0,  1,  0],
  [  1,  0,  1],
  [  1,  1,  0],
]) ('op:ANL',
    (x, y, and)  => {
      test(`ANL C,/bit 0xB0 ${x}&/${y}=${and}`, () => {
        const bit = 0x42;
        clearIRAM();
        putCode(0x100, 0xB0);       // ANL C,bit
        putCode(0x101, bit, false);
        cpu.PSW = 0;

        cpu.setBIT(bit, y);
        cpu.ACC = 0;
        cpu.CY = x;

        cpu.run1(0x100);              // ANL C,bit
        expect(cpu.PC).toBe(0x102);
        expect(cpu.CY).toBe(and);
        expect(cpu.AC).toBe(0);
        expect(cpu.ACC).toBe(0);
        expect(cpu.getBIT(bit)).toBe(y);
      });
    });


//////////////// ORL ////////////////
describe.each([
  // x     y    or
  [0x00, 0x00, 0x00],
  [0xFF, 0x00, 0xFF],
  [0xFF, 0xFF, 0xFF],
  [0x00, 0xFF, 0xFF],
  [0x01, 0x05, 0x05],
  [0x02, 0x05, 0x07],
  [0x04, 0x05, 0x05],
  [0x08, 0x05, 0x0D],
  [0x10, 0x05, 0x15],
  [0x20, 0x05, 0x25],
  [0x40, 0x05, 0x45],
  [0x80, 0x05, 0x85],
]) ('op:ORL=0x4x',
  (x, y, or)  => {

    test(`A,dir 0x45 ${toHex2(x)}|${toHex2(y)}=${toHex2(or)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x45);       // ORL A,dir
      putCode(0x101, dir, false);

      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;

      cpu.run1(0x100);              // ORL A,dir
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[dir]).toBe(x);
    });

    _.range(0,8).forEach(r => test(`A,R${r} 0x4B ${toHex2(x)}|${toHex2(y)}=${toHex2(or)}`, () => {
      cpu.PSW = 0;
      putCode(0x100, 0x48 | r);       // ORL A,Rr
      cpu.iram[r] = x;              // Rr
      cpu.ACC = y;

      cpu.run1(0x100);              // ORL A,Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[r]).toBe(x);
    }));

    _.range(0,2).forEach(r => test(`A,@R${r} 0x47 ${toHex2(x)}|${toHex2(y)}=${toHex2(or)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x46 | r);       // ORL A,@Rr
      cpu.iram[r] = dir;            // Set Rr=dir for @Rr
      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;

      cpu.run1(0x100);              // ORL A,@Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[r]).toBe(dir);
      expect(cpu.iram[dir]).toBe(x);
    }));

    test(`A,#imm 0x44 ${toHex2(x)}|${toHex2(y)}=${toHex2(or)}`, () => {
      const imm = x;
      clearIRAM();
      putCode(0x100, 0x44);       // ORL A,#imm
      putCode(0x101, imm, false);

      cpu.PSW = 0;
      cpu.ACC = y;

      cpu.run1(0x100);              // ORL A,#imm
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });

    test(`dir,A 0x42 ${toHex2(x)}|${toHex2(y)}=${toHex2(or)}`, () => {
      const dir = 0x47;
      clearIRAM();
      putCode(0x100, 0x42);       // ORL dir,A
      putCode(0x101, dir, false);

      cpu.PSW = 0;
      cpu.iram[dir] = x;
      cpu.ACC = y;

      cpu.run1(0x100);              // ORL dir,A
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(y);
      expect(cpu.iram[dir]).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });

    test(`ORL dir,#imm 0x43 ${toHex2(x)}|${toHex2(y)}=${toHex2(or)}`, () => {
      const dir = 0x42;
      const imm = x;
      clearIRAM();
      putCode(0x100, 0x43);       // ORL dir,#imm
      putCode(0x101, dir, false);
      putCode(0x102, imm, false);
      cpu.iram[dir] = y;
      cpu.PSW = 0;
      cpu.ACC = 0xDA;

      cpu.run1(0x100);              // ORL dir,#imm
      expect(cpu.PC).toBe(0x103);
      expect(cpu.ACC).toBe(0xDA);
      expect(cpu.iram[dir]).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });
  });


//////////////// ORL C,src ////////////////
describe.each([
  // x   y  or
  [  0,  0,  0],
  [  0,  1,  1],
  [  1,  0,  1],
  [  1,  1,  1],
]) ('op:ORL',
  (x, y, or)  => {
    test(`C,bit 0x82 ${x}|${y}=${or}`, () => {
      const bit = 0x72;
      clearIRAM();
      putCode(0x100, 0x72);       // ORL C,bit
      putCode(0x101, bit, false);
      cpu.PSW = 0;

      cpu.setBIT(bit, y);
      cpu.ACC = 0;
      cpu.CY = x;

      cpu.run1(0x100);              // ORL C,bit
      expect(cpu.PC).toBe(0x102);
      expect(cpu.CY).toBe(or);
      expect(cpu.AC).toBe(0);
      expect(cpu.ACC).toBe(0);
      expect(cpu.getBIT(bit)).toBe(y);
    });
  });


//////////////// ORL C,/src ////////////////
describe.each([
  // x   y  or
  [  0,  0,  1],
  [  0,  1,  0],
  [  1,  0,  1],
  [  1,  1,  1],
]) ('op:ORL',
    (x, y, or)  => {
      test(`ORL C,/bit0xA0  ${x}|/${y}=${or}`, () => {
        const bit = 0x33;
        clearIRAM();
        putCode(0x100, 0xA0);       // ORL C,/bit
        putCode(0x101, bit, false);
        cpu.PSW = 0;

        cpu.setBIT(bit, y);
        cpu.ACC = 0;
        cpu.CY = x;

        cpu.run1(0x100);              // ORL C,/bit
        expect(cpu.PC).toBe(0x102);
        expect(cpu.CY).toBe(or);
        expect(cpu.AC).toBe(0);
        expect(cpu.ACC).toBe(0);
        expect(cpu.getBIT(bit)).toBe(y);
      });
    });


//////////////// XRL ////////////////
describe.each([
  // x     y    xor
  [0x00, 0x00, 0x00],
  [0xFF, 0x00, 0xFF],
  [0xFF, 0xFF, 0x00],
  [0x00, 0xFF, 0xFF],
  [0x01, 0x05, 0x04],
  [0x02, 0x05, 0x07],
  [0x04, 0x05, 0x01],
  [0x08, 0x05, 0x0D],
  [0x10, 0x05, 0x15],
]) ('op:XRL',
  (x, y, xor)  => {

    test(`A,dir ${toHex2(x)}&${toHex2(y)}=${toHex2(xor)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x65);       // XRL A,dir
      putCode(0x101, dir, false);
      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;

      cpu.run1(0x100);              // XRL A,dir
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(xor);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[dir]).toBe(x);
    });

    _.range(0,8).forEach(r => test(`A,R${r} ${toHex2(x)}+${toHex2(y)}=${toHex2(xor)}`, () => {
      cpu.PSW = 0;
      putCode(0x100, 0x68 | r);       // XRL A,Rr
      cpu.iram[r] = x;              // Rr
      cpu.ACC = y;

      cpu.run1(0x100);              // XRL A,Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(xor);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[r]).toBe(x);
    }));

    _.range(0,2).forEach(r => test(`A,@R${r} ${toHex2(x)}+${toHex2(y)}=${toHex2(xor)}`, () => {
      const dir = 0x62;
      clearIRAM();
      putCode(0x100, 0x66 | r);       // XRL A,@Rr
      cpu.iram[r] = dir;            // Set Rr=dir for @Rr
      cpu.iram[dir] = x;

      cpu.PSW = 0;
      cpu.ACC = y;

      cpu.run1(0x100);              // XRL A,@Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(xor);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[r]).toBe(dir);
      expect(cpu.iram[dir]).toBe(x);
    }));

    test(`A,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(xor)}`, () => {
      const imm = x;
      clearIRAM();
      putCode(0x100, 0x64);       // XRL A,#imm
      putCode(0x101, imm, false);

      cpu.PSW = 0;
      cpu.ACC = y;

      cpu.run1(0x100);              // XRL A,#imm
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(xor);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });

    test(`dir,A ${toHex2(x)}+${toHex2(y)}=${toHex2(xor)}`, () => {
      const dir = 0x62;
      clearIRAM();
      putCode(0x100, 0x62);       // XRL dir,A
      putCode(0x101, dir, false);

      cpu.PSW = 0;
      cpu.iram[dir] = x;
      cpu.ACC = y;

      cpu.run1(0x100);              // XRL dir,A
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(y);
      expect(cpu.iram[dir]).toBe(xor);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });

    test(`XRL dir,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(xor)}`, () => {
      const dir = 0x62;
      const imm = x;
      clearIRAM();
      putCode(0x100, 0x63);       // XRL dir,#imm
      putCode(0x101, dir, false);
      putCode(0x102, imm, false);
      cpu.iram[dir] = y;
      cpu.PSW = 0;
      cpu.ACC = 0xDA;

      cpu.run1(0x100);              // XRL dir,#imm
      expect(cpu.PC).toBe(0x103);
      expect(cpu.ACC).toBe(0xDA);
      expect(cpu.iram[dir]).toBe(xor);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });
  });


describe('op:POP', () => {

  test('dir', () => {
    const dir = 0x42;
    const spBase = 0x20;
    clearIRAM();
    putCode(0x100, 0xD0);     // POP dir
    putCode(0x101, dir, false);
    cpu.iram[spBase] = 0xFE;
    cpu.iram[dir] = 0xAA;
    cpu.SP = spBase;
    cpu.PSW = 0;
    cpu.ACC = 0xCD;

    cpu.run1(0x100);            // POP
    expect(cpu.PC).toBe(0x102);
    expect(cpu.SP).toBe(spBase - 1);
    expect(cpu.iram[dir]).toBe(0xFE);
    expect(cpu.ACC).toBe(0xCD);
    expect(cpu.PSW).toBe(0);
  });
});


describe('op:PUSH', () => {

  test('dir', () => {
    const dir = 0x42;
    const spBase = 0x20;
    clearIRAM();
    putCode(0x100, 0xC0);     // PUSH dir
    putCode(0x101, dir, false);
    cpu.iram[dir] = 0x73;
    cpu.SP = spBase;
    cpu.PSW = 0;
    cpu.ACC = 0xCD;

    cpu.run1(0x100);            // POP
    expect(cpu.PC).toBe(0x102);
    expect(cpu.SP).toBe(spBase + 1);
    expect(cpu.iram[spBase + 1]).toBe(0x73);
    expect(cpu.ACC).toBe(0xCD);
    expect(cpu.PSW).toBe(0);
  });
});


//////////////// SUBB ////////////////
describe.each([
  // inCY  x     y   diff  cy  ov  ac
  [   0, 0x00, 0x00, 0x00,  0,  0,  0],
  [   1, 0x00, 0x00, 0xFF,  1,  0,  1],
  [   1, 0x00, 0xFF, 0x00,  1,  0,  1],
  [   0, 0x02, 0x02, 0x00,  0,  0,  0],
  [   1, 0x02, 0x02, 0xFF,  1,  0,  1],
  [   0, 0x64, 0x42, 0x22,  0,  0,  0],
  [   0, 0x37, 0x41, 0xF6,  1,  0,  0],
  [   0, 0x77, 0x47, 0x30,  0,  0,  0],
  [   0, 0x97, 0x97, 0x00,  0,  0,  0],
  [   0, 0x99, 0x9A, 0xFF,  1,  0,  1],
  [   1, 0x99, 0x66, 0x32,  0,  1,  0],
  [   0, 0x88, 0x77, 0x11,  0,  1,  0],
  [   0, 0x10, 0x08, 0x08,  0,  0,  1],
]) ('op:SUBB',
  (inCY, x, y, diff, cy, ov, ac)  => {
    test(`${toHex2(x)}-${toHex2(y)},CY=${inCY}=${toHex2(diff)}, CY=${cy},OV=${ov},AC=${ac}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x95);       // SUBB A,dir
      putCode(0x101, dir, false);

      cpu.iram[dir] = y;

      cpu.PSW = 0;
      cpu.ACC = x;
      cpu.CY = inCY;

      cpu.run1(0x100);              // SUBB A,dir
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(diff);
      expect(cpu.CY).toBe(cy);
      expect(cpu.OV).toBe(ov);
      expect(cpu.AC).toBe(ac);
      expect(cpu.iram[dir]).toBe(y);
    });

    _.range(0,8).forEach(r => {
      test(`A,R${r} ${toHex2(x)}-${toHex2(y)},CY=${inCY}=${toHex2(diff)},CY=${cy},OV=${ov},AC=${ac}`, () => {
      clearIRAM();
      cpu.PSW = 0;
      putCode(0x100, 0x98 | r);     // SUBB A,Rr
      cpu.iram[r] = y;              // Rr
      cpu.ACC = x;
      cpu.CY = inCY;

      cpu.run1(0x100);              // SUBB A,Rr
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(diff);
      expect(cpu.CY).toBe(cy);
      expect(cpu.OV).toBe(ov);
      expect(cpu.AC).toBe(ac);
      expect(cpu.iram[r]).toBe(y);
      });

    });

    test(`A,@Ri ${toHex2(x)}-${toHex2(y)},CY=${inCY}=${toHex2(diff)},CY=${cy},OV=${ov},AC=${ac}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0x97);       // SUBB A,@R1
      cpu.iram[1] = dir;            // Set R1=dir for @R1
      cpu.iram[dir] = y;

      cpu.PSW = 0;
      cpu.ACC = x;
      cpu.CY = inCY;

      cpu.run1(0x100);              // SUBB A,dir
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(diff);
      expect(cpu.CY).toBe(cy);
      expect(cpu.OV).toBe(ov);
      expect(cpu.AC).toBe(ac);
      expect(cpu.iram[1]).toBe(dir);
      expect(cpu.iram[dir]).toBe(y);
    });

    test(`A,#imm ${toHex2(x)}-${toHex2(y)},CY=${inCY}=${toHex2(diff)},CY=${cy},OV=${ov},AC=${ac}`, () => {
      const imm = y;
      clearIRAM();
      putCode(0x100, 0x94);       // SUBB A,#imm
      putCode(0x101, imm, false);

      cpu.PSW = 0;
      cpu.ACC = x;
      cpu.CY = inCY;

      cpu.run1(0x100);              // SUBB A,#imm
      expect(cpu.PC).toBe(0x102);
      expect(cpu.ACC).toBe(diff);
      expect(cpu.CY).toBe(cy);
      expect(cpu.OV).toBe(ov);
      expect(cpu.AC).toBe(ac);
    });
  });


//////////////// SWAP ////////////////
describe.each([
  //    x   swap
  [   0x00, 0x00],
  [   0x01, 0x10],
  [   0x10, 0x01],
  [   0xF0, 0x0F],
  [   0xF8, 0x8F],
  [   0x22, 0x22],
  [   0x12, 0x21],
]) ('op:SWAP',
  (x, swap)  => {
    test(`${toHex2(x)}=${toHex2(swap)}`, () => {
      const dir = 0x42;
      clearIRAM();
      putCode(0x100, 0xC4);       // SWAP A
      cpu.PSW = 0;
      cpu.ACC = x;

      cpu.run1(0x100);              // SWAP A
      expect(cpu.PC).toBe(0x101);
      expect(cpu.ACC).toBe(swap);
      expect(cpu.CY).toBe(0);
      expect(cpu.OV).toBe(0);
      expect(cpu.AC).toBe(0);
    });
  });


describe('op:XCH', () => {

  test('A,R3', () => {
    clearIRAM();
    putCode(0x100, 0xCB);     // XCH A,R3
    cpu.iram[3] = 0x73;
    cpu.ACC = 0x32;
    cpu.PSW = 0;

    cpu.run1(0x100);            // XCH
    expect(cpu.PC).toBe(0x101);
    expect(cpu.iram[3]).toBe(0x32);
    expect(cpu.ACC).toBe(0x73);
    expect(cpu.PSW).toBe(0);
  });

  test('A,dir', () => {
    const dir = 0x42;
    clearIRAM();
    putCode(0x100, 0xC5);     // XCH A,dir
    putCode(0x101, dir, false);
    cpu.iram[dir] = 0x73;
    cpu.ACC = 0x32;
    cpu.PSW = 0;

    cpu.run1(0x100);            // XCH
    expect(cpu.PC).toBe(0x102);
    expect(cpu.iram[dir]).toBe(0x32);
    expect(cpu.ACC).toBe(0x73);
    expect(cpu.PSW).toBe(0);
  });

  test('A,@R1', () => {
    const dir = 0x42;
    clearIRAM();
    putCode(0x100, 0xC7);     // XCH A,@R1
    cpu.iram[1] = dir;
    cpu.iram[dir] = 0x73;
    cpu.ACC = 0x32;
    cpu.PSW = 0;

    cpu.run1(0x100);            // XCH
    expect(cpu.PC).toBe(0x101);
    expect(cpu.iram[1]).toBe(dir);
    expect(cpu.iram[dir]).toBe(0x32);
    expect(cpu.ACC).toBe(0x73);
    expect(cpu.PSW).toBe(0);
  });
});


describe('op:XCHD', () => {

  test('A,@R1', () => {
    const dir = 0x42;
    clearIRAM();
    putCode(0x100, 0xD7);     // XCHD A,@R1
    cpu.iram[1] = dir;
    cpu.iram[dir] = 0x75;
    cpu.ACC = 0x32;
    cpu.PSW = 0;

    cpu.run1(0x100);            // XCHD
    expect(cpu.PC).toBe(0x101);
    expect(cpu.iram[1]).toBe(dir);
    expect(cpu.iram[dir]).toBe(0x72);
    expect(cpu.ACC).toBe(0x35);
    expect(cpu.PSW).toBe(0);
  });
});



function toSigned(v) {
  return v & 0x80 ? v - 0x100 : v;
}


function clearCode() {
  cpu.code.fill(0x00, 0x00, cpu.code.length);
}


function clearXRAM() {
  cpu.xram.fill(0x00, 0x00, cpu.xram.length);
}


function clearIRAM() {
  cpu.iram.fill(0x00, 0x00, 0x80);
}
