const SIM = require('./sim');
const {toHex1, toHex2, toHex4} = require('./simutils');
const CPU = require('./cpu');

const cpu = SIM.cpu;

// Define each SFR address globally
Object.keys(CPU.SFRs).forEach(name => global[name] = CPU.SFRs[name]);


//////////// NOP ////////////
test('NOP', () => {
  clearIRAM();
  cpu.code[0x100] = 0x00;       // NOP
  cpu.SFR[ACC] = 0x42;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.SFR[PSW]).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x42);
});

//////////// ACALL/RET ////////////
describe.each([0, 1, 2, 3, 4, 5, 6, 7])('ACALL/RET', fromPage => {

  test(`page${fromPage}`, () => {
    const pageOffset = 0x24;
    const callBase = fromPage * 0x100 + 0x42;

    clearIRAM();

    for (let toPage = 0; toPage < 8; ++toPage) {
      const callTarget = (toPage * 0x100) + pageOffset;
      cpu.code[callBase] = (toPage * 0x20) + 0x11;      // ACALL pageN
      cpu.code[callBase + 1] = pageOffset;
      cpu.code[callTarget] = 0x22;                      // RET

      cpu.SFR[ACC] = 0x42;
      cpu.SFR[PSW] = 0;
      cpu.SFR[SP] = 0x07;

      cpu.run1(callBase);                       // CALL
      expect(cpu.pc).toBe(callTarget);
      expect(cpu.SFR[PSW]).toBe(0);
      expect(cpu.SFR[ACC]).toBe(0x42);
      expect(cpu.SFR[SP]).toBe(0x09);
      cpu.run1(callTarget);                     // RET
      expect(cpu.pc).toBe(callBase + 2);
      expect(cpu.SFR[PSW]).toBe(0);
      expect(cpu.SFR[ACC]).toBe(0x42);
      expect(cpu.SFR[SP]).toBe(0x07);

      // Clean out RET for next iter
      cpu.code[callTarget] = 0x00;
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
])('LCALL/RETI', (callBase, newPC) => {
  test(`${toHex4(callBase)} --> ${toHex4(newPC)}`, () => {
    const retPC = (callBase + 3) & 0xFFFF;
    const acBase = 0x43;
    const spBase = 7;

    clearIRAM();
    cpu.code[callBase] = 0x12;      // LCALL
    cpu.code[callBase + 1] = newPC >>> 8;
    cpu.code[callBase + 2] = newPC & 0xFF;
    cpu.code[newPC] = 0x32;         // RETI

    cpu.SFR[ACC] = acBase;
    cpu.SFR[PSW] = 0;
    cpu.SFR[SP] = spBase;

    cpu.run1(callBase);             // LCALL
    expect(cpu.pc).toBe(newPC);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(acBase);
    expect(cpu.SFR[SP]).toBe(spBase + 2);
    expect(cpu.iram[spBase+2]).toBe(retPC >>> 8);
    expect(cpu.iram[spBase+1]).toBe(retPC & 0xFF);
    cpu.run1(newPC);                // RET
    expect(cpu.pc).toBe(retPC);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(acBase);
    expect(cpu.SFR[SP]).toBe(spBase);
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
])('LJMP', (callBase, newPC) => {
  test(`${toHex4(callBase)} --> ${toHex4(newPC)}`, () => {
    const retPC = (callBase + 3) & 0xFFFF;
    const acBase = 0x43;
    const spBase = 7;

    clearIRAM();
    cpu.code[callBase] = 0x02;      // LJMP
    cpu.code[callBase + 1] = newPC >>> 8;
    cpu.code[callBase + 2] = newPC & 0xFF;

    cpu.SFR[ACC] = acBase;
    cpu.SFR[PSW] = 0;
    cpu.SFR[SP] = spBase;

    cpu.run1(callBase);             // JMP
    expect(cpu.pc).toBe(newPC);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(acBase);
    expect(cpu.SFR[SP]).toBe(spBase);
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
])('SJMP', (pc, rela, newPC) => {
  test(`${toHex4(pc)} --> ${toHex4(newPC)}`, () => {
    const basePC = (pc + 2) & 0xFFFF;
    const acBase = 0x43;

    clearIRAM();
    cpu.code[pc] = 0x80;      // SJMP
    cpu.code[pc + 1] = rela;
    cpu.SFR[ACC] = acBase;
    cpu.SFR[PSW] = 0;

    cpu.run1(pc);             // SJMP
    expect(cpu.pc).toBe(newPC);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(acBase);
  });
});


//////////// AJMP ////////////
describe.each([0, 1, 2, 3, 4, 5, 6, 7])('AJMP', fromPage => {

  test(`AJMP from page${fromPage}`, () => {
    const pageOffset = 0x24;
    const jmpBase = fromPage * 0x100 + 0x42;
    const spBase = 0x07;
    const acBase = 0x42;

    clearIRAM();

    for (let toPage = 0; toPage < 8; ++toPage) {
      const jmpTarget = (toPage * 0x100) + pageOffset;
      cpu.code[jmpBase] = (toPage * 0x20) + 0x01;      // AJMP pageN
      cpu.code[jmpBase + 1] = pageOffset;

      cpu.SFR[ACC] = acBase;
      cpu.SFR[PSW] = 0;
      cpu.SFR[SP] = spBase;

      cpu.run1(jmpBase);                       // AJMP
      expect(cpu.pc).toBe(jmpTarget);
      expect(cpu.SFR[PSW]).toBe(0);
      expect(cpu.SFR[ACC]).toBe(acBase);
      expect(cpu.SFR[SP]).toBe(spBase);
    }
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
  'CJNE',
  (x, y, ltCY, rela, jump)  => {
    test(`A,dir,rel A=${toHex2(x)} dir=${toHex2(y)}, ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0xB5;       // CJNE A,dir,rela
      cpu.code[0x101] = dir;
      cpu.code[0x102] = rela;
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = x;
      cpu.iram[dir] = y;

      cpu.run1(0x100);              // CJNE A,dir,rela
      expect(cpu.pc).toBe(jump ? 0x103 + cpu.toSigned(rela) : 0x103);
      expect(cpu.SFR[ACC]).toBe(x);
      expect(cpu.iram[dir]).toBe(y);
      expect(cpu.CY).toBe(ltCY);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`A,#imm,rel A=${toHex2(x)} imm=${toHex2(y)}, ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`, () => {
      const imm = y;
      clearIRAM();
      cpu.code[0x100] = 0xB4;       // CJNE A,dir,rela
      cpu.code[0x101] = imm;
      cpu.code[0x102] = rela;
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = x;

      cpu.run1(0x100);              // CJNE A,#imm,rela
      expect(cpu.pc).toBe(jump ? 0x103 + cpu.toSigned(rela) : 0x103);
      expect(cpu.SFR[ACC]).toBe(x);
      expect(cpu.CY).toBe(ltCY);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`R3,#imm,rel R3=${toHex2(x)} imm=${toHex2(y)}, ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`, () => {
      const imm = y;
      clearIRAM();
      cpu.code[0x100] = 0xBB;       // CJNE R3,#imm,rela
      cpu.code[0x101] = imm;
      cpu.code[0x102] = rela;
      cpu.SFR[PSW] = 0;
      cpu.iram[3] = x;

      cpu.run1(0x100);              // CJNE A,#imm,rela
      expect(cpu.pc).toBe(jump ? 0x103 + cpu.toSigned(rela) : 0x103);
      expect(cpu.iram[3]).toBe(x);
      expect(cpu.CY).toBe(ltCY);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`@R1,#imm,rel @R1=${toHex2(x)} imm=${toHex2(y)}, ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`, () => {
      const imm = y;
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0xB7;       // CJNE R3,#imm,rela
      cpu.code[0x101] = imm;
      cpu.code[0x102] = rela;
      cpu.SFR[PSW] = 0;
      cpu.iram[dir] = x;
      cpu.iram[1] = dir;

      cpu.run1(0x100);              // CJNE R3,#imm,rela
      expect(cpu.pc).toBe(jump ? 0x103 + cpu.toSigned(rela) : 0x103);
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
]) (
  'DJNZ',
  (x, y, jump)  => {
    test(`DJNZ dir,rel dir=${toHex2(y)}, jump=${jump}`, () => {
      const dir = 0x42;
      const acBase = 0xAA;
      const rela = -0x10 & 0xFF;
      clearIRAM();
      cpu.code[0x100] = 0xD5;       // DJNZ dir,rela
      cpu.code[0x101] = dir;
      cpu.code[0x102] = rela;
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = acBase;
      cpu.iram[dir] = x;

      cpu.run1(0x100);              // DJNZ dir,rela
      expect(cpu.pc).toBe(jump ? 0x103 + cpu.toSigned(rela) : 0x103);
      expect(cpu.SFR[ACC]).toBe(acBase);
      expect(cpu.iram[dir]).toBe(y);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`DJNZ R3,rel R3=${toHex2(y)}, jump=${jump}`, () => {
      const acBase = 0xAA;
      const rela = -0x10 & 0xFF;
      clearIRAM();
      cpu.code[0x100] = 0xDB;       // DJNZ R3,rela
      cpu.code[0x101] = rela;
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = acBase;
      cpu.iram[3] = x;

      cpu.run1(0x100);              // DJNZ R3,rela
      expect(cpu.pc).toBe(jump ? 0x102 + cpu.toSigned(rela) : 0x102);
      expect(cpu.iram[3]).toBe(y);
      expect(cpu.SFR[ACC]).toBe(acBase);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
  });


//////////// JB ////////////
test(`JB bit,rel bit=0`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x20;       // JB bit,rela
  cpu.code[0x101] = bit;
  cpu.code[0x102] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.BIT[bit] = 0;

  cpu.run1(0x100);              // JB bit,rela
  expect(cpu.pc).toBe(0x103);
  expect(cpu.BIT[bit]).toBe(0);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`JB bit,rel bit=1`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x20;       // JB bit,rela
  cpu.code[0x101] = bit;
  cpu.code[0x102] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.BIT[bit] = 1;

  cpu.run1(0x100);              // JB bit,rela
  expect(cpu.pc).toBe(0x103 + cpu.toSigned(rela));
  expect(cpu.BIT[bit]).toBe(1);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JBC ////////////
test(`JBC bit,rel bit=0`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x10;       // JBC bit,rela
  cpu.code[0x101] = bit;
  cpu.code[0x102] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.BIT[bit] = 0;

  cpu.run1(0x100);              // JBC bit,rela
  expect(cpu.pc).toBe(0x103);
  expect(cpu.BIT[bit]).toBe(0);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`JBC bit,rel bit=1`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x10;       // JBC bit,rela
  cpu.code[0x101] = bit;
  cpu.code[0x102] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.BIT[bit] = 1;

  cpu.run1(0x100);              // JBC bit,rela
  expect(cpu.pc).toBe(0x103 + cpu.toSigned(rela));
  expect(cpu.BIT[bit]).toBe(0);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JNB ////////////
test(`JNB bit,rel bit=0`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x30;       // JNB bit,rela
  cpu.code[0x101] = bit;
  cpu.code[0x102] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.BIT[bit] = 0;

  cpu.run1(0x100);              // JNB bit,rela
  expect(cpu.pc).toBe(0x103 + cpu.toSigned(rela));
  expect(cpu.BIT[bit]).toBe(0);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`JNB bit,rel bit=1`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x30;       // JNB bit,rela
  cpu.code[0x101] = bit;
  cpu.code[0x102] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.BIT[bit] = 1;

  cpu.run1(0x100);              // JNB bit,rela
  expect(cpu.pc).toBe(0x103);
  expect(cpu.BIT[bit]).toBe(1);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JC ////////////
test(`JC rel CY=0`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x40;       // JC rela
  cpu.code[0x101] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.CY = 0;

  cpu.run1(0x100);              // JC rela
  expect(cpu.pc).toBe(0x102);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`JC rel CY=1`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x40;       // JC rela
  cpu.code[0x102] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.CY = 1;

  cpu.run1(0x100);              // JC rela
  expect(cpu.pc).toBe(0x102 + cpu.toSigned(rela));
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(1);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JNC ////////////
test(`JNC rel CY=0`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x50;       // JNC rela
  cpu.code[0x101] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.CY = 0;

  cpu.run1(0x100);              // JNC rela
  expect(cpu.pc).toBe(0x102 + cpu.toSigned(rela));
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`JNC rel CY=1`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x50;       // JNC rela
  cpu.code[0x102] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.CY = 1;

  cpu.run1(0x100);              // JNC rela
  expect(cpu.pc).toBe(0x102);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(1);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JZ ////////////
test(`JZ rel AC=55`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x60;       // JZ rela
  cpu.code[0x101] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;

  cpu.run1(0x100);              // JZ rela
  expect(cpu.pc).toBe(0x102);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`JZ rel AC=00`, () => {
  const acBase = 0x00;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x60;       // JZ rela
  cpu.code[0x102] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;

  cpu.run1(0x100);              // JZ rela
  expect(cpu.pc).toBe(0x102 + cpu.toSigned(rela));
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////// JNZ ////////////
test(`JNZ rel AC=55`, () => {
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x70;       // JNZ rela
  cpu.code[0x101] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;

  cpu.run1(0x100);              // JNZ rela
  expect(cpu.pc).toBe(0x102 + cpu.toSigned(rela));
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`JNZ rel AC=00`, () => {
  const acBase = 0x00;
  const rela = -0x13 & 0xFF;
  clearIRAM();
  cpu.code[0x100] = 0x70;       // JNZ rela
  cpu.code[0x102] = rela;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = acBase;

  cpu.run1(0x100);              // JNZ rela
  expect(cpu.pc).toBe(0x102);
  expect(cpu.SFR[ACC]).toBe(acBase);
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
]) (
  'JMP @A+DPTR',
  (a, dptr, newPC)  => {
    test(`JMP @A+DPTR`, () => {
      clearIRAM();
      cpu.code[0x100] = 0x73;       // JMP @A+DPTR
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = a;
      cpu.DPTR = dptr;

      cpu.run1(0x100);              // JMP @A+DPTR
      expect(cpu.pc).toBe(newPC);
      expect(cpu.SFR[ACC]).toBe(a);
      expect(cpu.DPTR).toBe(dptr);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
  });


//////////// MOV ////////////
describe('MOV', () => {

  test(`A,R3`, () => {
    const v = 0x43;
    clearIRAM();
    cpu.code[0x1000] = 0xEB;        // MOV A,R3
    cpu.SFR[ACC] = 0xAA;
    cpu.SFR[PSW] = 0;
    cpu.iram[3] = v;

    cpu.run1(0x1000);               // MOV
    expect(cpu.pc).toBe(0x1001);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(v);
    expect(cpu.iram[3]).toBe(v);
  });

  test(`A,dir`, () => {
    const v = 0x43;
    const dir = 0x42;
    clearIRAM();
    cpu.code[0x1000] = 0xE5;        // MOV A,dir
    cpu.code[0x1001] = dir;
    cpu.SFR[ACC] = 0xAA;
    cpu.SFR[PSW] = 0;
    cpu.iram[dir] = v;

    cpu.run1(0x1000);               // MOV
    expect(cpu.pc).toBe(0x1002);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(v);
    expect(cpu.iram[dir]).toBe(v);
  });

  test(`A,@R1`, () => {
    const v = 0x43;
    const dir = 0x42;
    clearIRAM();
    cpu.code[0x1000] = 0xE7;        // MOV A,@R1
    cpu.SFR[ACC] = 0xAA;
    cpu.SFR[PSW] = 0;
    cpu.iram[1] = dir;
    cpu.iram[dir] = v;

    cpu.run1(0x1000);               // MOV
    expect(cpu.pc).toBe(0x1001);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(v);
    expect(cpu.iram[dir]).toBe(v);
    expect(cpu.iram[1]).toBe(dir);
  });

  test(`A,#imm`, () => {
    const v = 0x43;
    clearIRAM();
    cpu.code[0x1000] = 0x74;        // MOV A,#imm
    cpu.code[0x1001] = v;
    cpu.SFR[ACC] = 0xAA;
    cpu.SFR[PSW] = 0;

    cpu.run1(0x1000);               // MOV
    expect(cpu.pc).toBe(0x1002);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(v);
  });

  test(`R3,A`, () => {
    const v = 0x43;
    clearIRAM();
    cpu.code[0x1000] = 0xFB;        // MOV R3,A
    cpu.SFR[ACC] = v;
    cpu.SFR[PSW] = 0;
    cpu.iram[3] = 0xAA;

    cpu.run1(0x1000);               // MOV
    expect(cpu.pc).toBe(0x1001);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(v);
    expect(cpu.iram[3]).toBe(v);
  });

  test(`R3,dir`, () => {
    const v = 0x43;
    const dir = 0x42;
    clearIRAM();
    cpu.code[0x1000] = 0xAB;        // MOV R3,dir
    cpu.code[0x1001] = dir;
    cpu.SFR[ACC] = 0xAA;
    cpu.SFR[PSW] = 0;
    cpu.iram[dir] = v;
    cpu.iram[3] = 0x42;

    cpu.run1(0x1000);               // MOV
    expect(cpu.pc).toBe(0x1002);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(0xAA);
    expect(cpu.iram[dir]).toBe(v);
    expect(cpu.iram[3]).toBe(v);
  });

  test(`R3,#imm`, () => {
    const v = 0x43;
    clearIRAM();
    cpu.code[0x1000] = 0x7B;        // MOV R3,#imm
    cpu.code[0x1001] = v;
    cpu.SFR[ACC] = 0xAA;
    cpu.SFR[PSW] = 0;
    cpu.iram[3] = 0x42;

    cpu.run1(0x1000);               // MOV
    expect(cpu.pc).toBe(0x1002);
    expect(cpu.SFR[PSW]).toBe(0);
    expect(cpu.SFR[ACC]).toBe(0xAA);
    expect(cpu.iram[3]).toBe(v);
  });
});


//////////// MOV bit ////////////
test(`MOV C,sbit=0`, () => {
  const bit = 0x42;
  clearIRAM();
  cpu.code[0x100] = 0xA2;       // MOV C,sbit
  cpu.code[0x101] = bit;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = 0xAA;
  cpu.CY = 0;
  cpu.BIT[bit] = 0;

  cpu.run1(0x100);              // MOV
  expect(cpu.pc).toBe(0x102);
  expect(cpu.SFR[ACC]).toBe(0xAA);
  expect(cpu.BIT[bit]).toBe(0);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});

test(`MOV C,sbit=1`, () => {
  const bit = 0x42;
  clearIRAM();
  cpu.code[0x100] = 0x92;       // MOV dbit,C
  cpu.code[0x101] = bit;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = 0xAA;
  cpu.CY = 1;
  cpu.BIT[bit] = 0;

  cpu.run1(0x100);              // MOV
  expect(cpu.pc).toBe(0x102);
  expect(cpu.SFR[ACC]).toBe(0xAA);
  expect(cpu.BIT[bit]).toBe(1);
  expect(cpu.CY).toBe(1);
  expect(cpu.AC).toBe(0);
  expect(cpu.OV).toBe(0);
});


//////////////// MOV DPTR,#imm16 ////////////////
test(`MOV DPTR,#data16`, () => {
  const d = 0x1234;
  clearIRAM();
  cpu.code[0x100] = 0x90;       // MOV DPTR,#imm
  cpu.code[0x101] = d >>> 8;
  cpu.code[0x102] = d & 0xFF;
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = 0xAA;
  cpu.DPTR = 0x9977;

  cpu.run1(0x100);              // MOV
  expect(cpu.pc).toBe(0x103);
  expect(cpu.DPTR).toBe(d);
  expect(cpu.SFR[ACC]).toBe(0xAA);
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
]) (
  'MOVC',
  (a, y, entAddr, newA)  => {
    test(`A,@A+DPTR a=${toHex2(a)},dptr=${toHex4(y)},entAddr=${toHex4(entAddr)},newA=${toHex2(newA)} `, () => {
      clearCode();
      clearIRAM();
      cpu.code[0x100] = 0x93;       // MOVC A,@A+DPTR
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = a;
      cpu.DPTR = y;
      cpu.code[entAddr] = newA;

      cpu.run1(0x100);              // MOVC
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(newA);
      expect(cpu.code[entAddr]).toBe(newA);
      expect(cpu.DPTR).toBe(y);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`A,@A+PC a=${toHex2(a)},pc=${toHex4(y)},entAddr=${toHex4(entAddr)},newA=${toHex2(newA)} `, () => {
      clearCode();
      clearIRAM();
      cpu.code[y-1] = 0x83;     // MOVC A,@A+PC
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = a;
      cpu.DPTR = 0x1111;
      cpu.code[entAddr] = newA;

      cpu.run1(y-1);              // MOVC
      expect(cpu.pc).toBe(y);
      expect(cpu.SFR[ACC]).toBe(newA);
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
]) (
  'MOVX',
  (addr, v)  => {
    test(`A,@R1 addr=${toHex4(addr)},v=${toHex2(v)} `, () => {
      clearCode();
      clearIRAM();
      clearXRAM();
      cpu.code[0x100] = 0xE3;       // MOVX A,@R1
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = 0x99;
      cpu.SFR[P2] = addr >>> 8;
      cpu.iram[1] = addr & 0xFF;
      cpu.xram[addr] = v;

      cpu.run1(0x100);              // MOVX
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(v);
      expect(cpu.SFR[P2]).toBe(addr >>> 8);
      expect(cpu.iram[1]).toBe(addr & 0xFF);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`A,@DPTR addr=${toHex4(addr)},v=${toHex2(v)} `, () => {
      clearCode();
      clearIRAM();
      clearXRAM();
      cpu.code[0x100] = 0xE0;       // MOVX A,@DPTR
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = 0x99;
      cpu.DPTR = addr;
      cpu.xram[addr] = v;

      cpu.run1(0x100);              // MOVX
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(v);
      expect(cpu.DPTR).toBe(addr);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`@R1,A addr=${toHex4(addr)},v=${toHex2(v)} `, () => {
      clearCode();
      clearIRAM();
      clearXRAM();
      cpu.code[0x100] = 0xF3;       // MOVX @R1,A
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = v;
      cpu.SFR[P2] = addr >>> 8;
      cpu.iram[1] = addr & 0xFF;
      cpu.xram[addr] = v;

      cpu.run1(0x100);              // MOVX
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(v);
      expect(cpu.SFR[P2]).toBe(addr >>> 8);
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
      cpu.code[0x100] = 0xF0;       // MOVX @R1,A
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = v;
      cpu.DPTR = addr;
      cpu.xram[addr] = 0xBB;

      cpu.run1(0x100);              // MOVX
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(v);
      expect(cpu.DPTR).toBe(addr);
      expect(cpu.xram[addr]).toBe(v);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
  });


//////////// CLR A ////////////
test('CLR A', () => {
  clearIRAM();
  cpu.code[0x100] = 0xE4;       // CLR A
  cpu.SFR[ACC] = 0x42;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0);
});

//////////// CLR bit ////////////
test('CLR bit', () => {
  const bit = 0x42;
  const acBase = 0xAA;
  clearIRAM();
  cpu.code[0x100] = 0xC2;       // CLR bit
  cpu.code[0x101] = bit;
  cpu.BIT[bit] = 1;
  cpu.SFR[ACC] = acBase;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x102);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.BIT[bit]).toBe(0);
});

//////////// CLR C ////////////
test('CLR C', () => {
  clearIRAM();
  cpu.code[0x100] = 0xC3;       // CLR C
  cpu.SFR[ACC] = 0x42;
  cpu.SFR[PSW] = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
});


//////////// SETB bit ////////////
test('SETB bit', () => {
  const bit = 0x42;
  const acBase = 0xAA;
  clearIRAM();
  cpu.code[0x100] = 0xD2;       // SETB bit
  cpu.code[0x101] = bit;
  cpu.BIT[bit] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x102);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.BIT[bit]).toBe(1);
});

//////////// SETB C ////////////
test('SETB C', () => {
  clearIRAM();
  cpu.code[0x100] = 0xD3;       // SETB C
  cpu.SFR[ACC] = 0x42;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.AC).toBe(0);
});



//////////// CPL A ////////////
test('CPL A', () => {
  const acBase = 0x42;
  clearIRAM();
  cpu.code[0x100] = 0xF4;       // CPL A
  cpu.SFR[ACC] = acBase;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.SFR[ACC]).toBe(acBase ^ 0xFF);
});

//////////// CPL bit ////////////
test('CPL bit=1', () => {
  const bit = 0x42;
  const acBase = 0xAA;
  clearIRAM();
  cpu.code[0x100] = 0xB2;       // CPL bit
  cpu.code[0x101] = bit;
  cpu.BIT[bit] = 1;
  cpu.SFR[ACC] = acBase;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x102);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.BIT[bit]).toBe(0);
});

//////////// CPL bit ////////////
test('CPL bit=0', () => {
  const bit = 0x42;
  const acBase = 0xAA;
  clearIRAM();
  cpu.code[0x100] = 0xB2;       // CPL bit
  cpu.code[0x101] = bit;
  cpu.BIT[bit] = 0;
  cpu.SFR[ACC] = acBase;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x102);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
  expect(cpu.SFR[ACC]).toBe(acBase);
  expect(cpu.BIT[bit]).toBe(1);
});

//////////// CPL C ////////////
test('CPL C=0', () => {
  const acBase = 0x42;
  clearIRAM();
  cpu.code[0x100] = 0xB3;       // CPL C
  cpu.SFR[ACC] = 0x42;
  cpu.SFR[PSW] = 0;
  cpu.CY = 0;
  cpu.SFR[ACC] = acBase;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.AC).toBe(0);
  expect(cpu.SFR[ACC]).toBe(acBase);
});

//////////// CPL C ////////////
test('CPL C=1', () => {
  clearIRAM();
  cpu.code[0x100] = 0xB3;       // CPL C
  cpu.SFR[ACC] = 0x42;
  cpu.SFR[PSW] = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
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
]) (
  'DEC',
  (x, dec)  => {
    test(`DEC A A=${toHex2(x)}, result=${toHex2(dec)}`, () => {
      clearIRAM();
      cpu.code[0x100] = 0x14;       // DEC A
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = x;

      cpu.run1(0x100);              // DEC A
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(dec);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
    test(`DEC R3, R3=${toHex2(x)} result=${toHex2(dec)}`, () => {
      clearIRAM();
      cpu.code[0x100] = 0x1B;       // DEC R3
      cpu.SFR[PSW] = 0;
      cpu.iram[3] = x;

      cpu.run1(0x100);              // DEC R3
      expect(cpu.pc).toBe(0x101);
      expect(cpu.iram[3]).toBe(dec);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
    test(`DEC dir, dir=${toHex2(x)} result=${toHex2(dec)}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x15;       // DEC dir
      cpu.code[0x101] = dir;
      cpu.SFR[PSW] = 0;
      cpu.iram[dir] = x;

      cpu.run1(0x100);              // DEC dir
      expect(cpu.pc).toBe(0x102);
      expect(cpu.iram[dir]).toBe(dec);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
    test(`DEC @R1 x=${toHex2(x)}, result=${toHex2(dec)}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x17;       // DEC @R1
      cpu.SFR[PSW] = 0;
      cpu.iram[dir] = x;
      cpu.iram[1] = dir;            // R1

      cpu.run1(0x100);              // DEC @R1
      expect(cpu.pc).toBe(0x101);
      expect(cpu.iram[1]).toBe(dir);
      expect(cpu.iram[dir]).toBe(dec);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
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
]) (
  'MUL AB',
  (x, y, prodB, prodA, ov)  => {
    test(`A=${toHex2(x)},B=${toHex2(y)}, prodA=${toHex2(prodA)},prodB=${toHex2(prodB)},ov=${ov}`, () => {
      clearIRAM();
      cpu.code[0x100] = 0xA4;       // MUL AB
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = x;
      cpu.SFR[B] = y;
      cpu.CY = 1;
      cpu.OV = 0;
      cpu.AC = 1;

      cpu.run1(0x100);              // MUL AB
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(prodA);
      expect(cpu.SFR[B]).toBe(prodB);
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
]) (
  'DIV AB',
  (x, y, div, rem, ov)  => {
    test(`A=${toHex2(x)}, B=${toHex2(y)}, div=${toHex2(div)} rem=${toHex2(rem)}, ov=${ov}`, () => {
      clearIRAM();
      cpu.code[0x100] = 0x84;       // DIV AB
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = x;
      cpu.SFR[B] = y;
      cpu.CY = 1;
      cpu.OV = 0;
      cpu.AC = 1;

      cpu.run1(0x100);              // DIV AB
      expect(cpu.pc).toBe(0x101);

      if (!ov) {
        expect(cpu.SFR[ACC]).toBe(div);
        expect(cpu.SFR[B]).toBe(rem);
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
]) (
  'INC',
  (x, inc)  => {
    test(`A A=${toHex2(x)}, result=${toHex2(inc)}`, () => {
      clearIRAM();
      cpu.code[0x100] = 0x04;       // INC A
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = x;

      cpu.run1(0x100);              // INC A
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(inc);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });

    test(`R3, R3=${toHex2(x)} result=${toHex2(inc)}`, () => {
      clearIRAM();
      cpu.code[0x100] = 0x0B;       // INC R3
      cpu.SFR[PSW] = 0;
      cpu.iram[3] = x;

      cpu.run1(0x100);              // INC R3
      expect(cpu.pc).toBe(0x101);
      expect(cpu.iram[3]).toBe(inc);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
    test(`dir, dir=${toHex2(x)} result=${toHex2(inc)}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x05;       // INC dir
      cpu.code[0x101] = dir;
      cpu.SFR[PSW] = 0;
      cpu.iram[dir] = x;

      cpu.run1(0x100);              // INC dir
      expect(cpu.pc).toBe(0x102);
      expect(cpu.iram[dir]).toBe(inc);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
    test(`@R1 x=${toHex2(x)}, result=${toHex2(inc)}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x07;       // INC @R1
      cpu.SFR[PSW] = 0;
      cpu.iram[dir] = x;
      cpu.iram[1] = dir;            // R1

      cpu.run1(0x100);              // INC @R1
      expect(cpu.pc).toBe(0x101);
      expect(cpu.iram[1]).toBe(dir);
      expect(cpu.iram[dir]).toBe(inc);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
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
]) (
  'INC DPTR',
  (x, inc)  => {
    test(`DPTR=${toHex2(x)}, result=${toHex2(inc)}`, () => {
      const acBase = 0xAA;
      clearIRAM();
      cpu.code[0x100] = 0xA3;       // INC DPTR
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = acBase;
      cpu.DPTR = x;

      cpu.run1(0x100);              // INC DPTR
      expect(cpu.pc).toBe(0x101);
      expect(cpu.DPTR).toBe(inc);
      expect(cpu.SFR[ACC]).toBe(acBase);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.OV).toBe(0);
    });
  });


//////////// RLC ////////////
test('RLC A=0x80,CY=0 = A=00,CY=1', () => {
  clearIRAM();
  cpu.code[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x80;
  cpu.SFR[PSW] = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x00);
});

test('RLC A=0x08,CY=0 = A=10,CY=0', () => {
  clearIRAM();
  cpu.code[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x08;
  cpu.SFR[PSW] = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x10);
});

test('RLC A=0x80,CY=1 = A=01,CY=1', () => {
  clearIRAM();
  cpu.code[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x80;
  cpu.SFR[PSW] = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x01);
});

test('RLC A=0x08,CY=1 = A=11,CY=0', () => {
  clearIRAM();
  cpu.code[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x08;
  cpu.SFR[PSW] = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x11);
});

test('RLC CY=1 bit walk', () => {
  clearIRAM();
  cpu.code[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x00;
  cpu.SFR[PSW] = 0;
  cpu.CY = 1;

  for (let k = 0; k < 8; ++k) {
    cpu.run1(0x100);
    expect(cpu.pc).toBe(0x101);
    expect(cpu.CY).toBe(0);
    expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
    expect(cpu.SFR[ACC]).toBe(0x01 << k);
  }

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x00);
});


//////////// RRC ////////////
test('RRC A=0x01,CY=0 = A=00,CY=1', () => {
  clearIRAM();
  cpu.code[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x01;
  cpu.SFR[PSW] = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x00);
});

test('RRC A=0x08,CY=0 = A=04,CY=0', () => {
  clearIRAM();
  cpu.code[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x08;
  cpu.SFR[PSW] = 0;
  cpu.CY = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x04);
});

test('RRC A=0x80,CY=1 = A=C0,CY=0', () => {
  clearIRAM();
  cpu.code[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x80;
  cpu.SFR[PSW] = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0xC0);
});

test('RRC A=0x08,CY=1 = A=84,CY=0', () => {
  clearIRAM();
  cpu.code[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x08;
  cpu.SFR[PSW] = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x84);
});

test('RRC CY=1 bit walk', () => {
  clearIRAM();
  cpu.code[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x00;
  cpu.SFR[PSW] = 0;
  cpu.CY = 1;

  for (let k = 0; k < 8; ++k) {
    cpu.run1(0x100);
    expect(cpu.pc).toBe(0x101);
    expect(cpu.CY).toBe(0);
    expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
    expect(cpu.SFR[ACC]).toBe(0x80 >>> k);
  }

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(1);
  expect(cpu.SFR[PSW] & ~CPU.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x00);
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
  'ADD',
  (inCY, x, y, addSum, addCY, addAC)  => {
    test(`A,dir ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x25;       // ADD A,dir
      cpu.code[0x101] = dir;

      cpu.iram[dir] = x;

      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADD A,dir
      expect(cpu.pc).toBe(0x102);
      expect(cpu.SFR[ACC]).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[dir]).toBe(x);
    });

    test(`A,Rn ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`, () => {
      clearIRAM();
      cpu.SFR[PSW] = 0;
      cpu.code[0x100] = 0x2B;       // ADD A,R3
      cpu.iram[3] = x;              // R3
      cpu.SFR[ACC] = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADD A,R3
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[3]).toBe(x);
    });

    test(`A,@Ri ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x27;       // ADD A,@R1
      cpu.iram[1] = dir;            // Set R1=dir for @R1
      cpu.iram[dir] = x;

      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADD A,@R1
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[1]).toBe(dir);
      expect(cpu.iram[dir]).toBe(x);
    });

    test(`A,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`, () => {
      const imm = x;
      clearIRAM();
      cpu.code[0x100] = 0x24;       // ADD A,#imm
      cpu.code[0x101] = imm;

      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;
      cpu.CY = inCY;

      cpu.run1(0x100);              // ADD A,#imm
      expect(cpu.pc).toBe(0x102);
      expect(cpu.SFR[ACC]).toBe(addSum);
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
  'ADDC',
  (inCY, x, y, addSum, addCY, addAC)  => {
    test(`${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`, () => {
           const dir = 0x42;
      clearIRAM();
           cpu.code[0x100] = 0x35;       // ADDC A,dir
           cpu.code[0x101] = dir;

           cpu.iram[dir] = x;

           cpu.SFR[PSW] = 0;
           cpu.SFR[ACC] = y;
           cpu.CY = inCY;

           cpu.run1(0x100);              // ADDC A,dir
           expect(cpu.pc).toBe(0x102);
           expect(cpu.SFR[ACC]).toBe(addSum);
           expect(cpu.CY).toBe(addCY);
           expect(cpu.AC).toBe(addAC);
           expect(cpu.iram[dir]).toBe(x);
         });

    test(`A,Rn ${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`, () => {
  clearIRAM();
           cpu.SFR[PSW] = 0;
           cpu.code[0x100] = 0x3B;       // ADDC A,R3
           cpu.iram[3] = x;              // R3
           cpu.SFR[ACC] = y;
           cpu.CY = inCY;

           cpu.run1(0x100);              // ADDC A,R3
           expect(cpu.pc).toBe(0x101);
           expect(cpu.SFR[ACC]).toBe(addSum);
           expect(cpu.CY).toBe(addCY);
           expect(cpu.AC).toBe(addAC);
           expect(cpu.iram[3]).toBe(x);
         });

    test(`A,@Ri ${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`, () => {
           const dir = 0x42;
  clearIRAM();
           cpu.code[0x100] = 0x37;       // ADDC A,@R1
           cpu.iram[1] = dir;            // Set R1=dir for @R1
           cpu.iram[dir] = x;

           cpu.SFR[PSW] = 0;
           cpu.SFR[ACC] = y;
           cpu.CY = inCY;

           cpu.run1(0x100);              // ADDC A,dir
           expect(cpu.pc).toBe(0x101);
           expect(cpu.SFR[ACC]).toBe(addSum);
           expect(cpu.CY).toBe(addCY);
           expect(cpu.AC).toBe(addAC);
           expect(cpu.iram[1]).toBe(dir);
           expect(cpu.iram[dir]).toBe(x);
         });

    test(`ADDC A,#imm ${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`, () => {
           const imm = x;
  clearIRAM();
           cpu.code[0x100] = 0x34;       // ADDC A,#imm
           cpu.code[0x101] = imm;

           cpu.SFR[PSW] = 0;
           cpu.SFR[ACC] = y;
           cpu.CY = inCY;

           cpu.run1(0x100);              // ADDC A,#imm
           expect(cpu.pc).toBe(0x102);
           expect(cpu.SFR[ACC]).toBe(addSum);
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
]) ('decimal addition',
  (inCY, x, y, addSum, addCY, addAC, daSum, daCY)  => {

    test(`${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(daSum)},CY=${daCY}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x35;       // ADDC A,dir
      cpu.code[0x101] = dir;
      cpu.code[0x102] = 0xD4;       // DA A

      cpu.iram[dir] = x;

      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;
      cpu.CY = inCY;

      cpu.run1(0x100);          // ADDC
      expect(cpu.pc).toBe(0x102);
      expect(cpu.SFR[ACC]).toBe(addSum);
      expect(cpu.CY).toBe(addCY);
      expect(cpu.AC).toBe(addAC);
      expect(cpu.iram[dir]).toBe(x);

      cpu.run1(cpu.pc);         // DA
      expect(cpu.pc).toBe(0x103);
      expect(cpu.SFR[ACC]).toBe(daSum);
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
]) (
  'ANL',
  (x, y, and)  => {

    test(`A,dir ${toHex2(x)}&${toHex2(y)}=${toHex2(and)}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x55;       // ANL A,dir
      cpu.code[0x101] = dir;

      cpu.iram[dir] = x;

      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);              // ANL A,dir
      expect(cpu.pc).toBe(0x102);
      expect(cpu.SFR[ACC]).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[dir]).toBe(x);
    });

    test(`A,Rn ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`, () => {
      cpu.SFR[PSW] = 0;
      cpu.code[0x100] = 0x5B;       // ANL A,R3
      cpu.iram[3] = x;              // R3
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);              // ANL A,R3
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[3]).toBe(x);
    });

    test(`A,@Ri ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x57;       // ANL A,@R1
      cpu.iram[1] = dir;            // Set R1=dir for @R1
      cpu.iram[dir] = x;

      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);              // ANL A,@R1
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[1]).toBe(dir);
      expect(cpu.iram[dir]).toBe(x);
    });

    test(`A,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`, () => {
      const imm = x;
      clearIRAM();
      cpu.code[0x100] = 0x54;       // ANL A,#imm
      cpu.code[0x101] = imm;

      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);              // ANL A,#imm
      expect(cpu.pc).toBe(0x102);
      expect(cpu.SFR[ACC]).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });

    test(`dir,A ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x52;       // ANL dir,A
      cpu.code[0x101] = dir;

      cpu.SFR[PSW] = 0;
      cpu.iram[dir] = x;
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);              // ANL dir,A
      expect(cpu.pc).toBe(0x102);
      expect(cpu.SFR[ACC]).toBe(y);
      expect(cpu.iram[dir]).toBe(and);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });

    test(`ANL dir,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`, () => {
      const dir = 0x42;
      const imm = x;
      clearIRAM();
      cpu.code[0x100] = 0x53;       // ANL dir,#imm
      cpu.code[0x101] = dir;
      cpu.code[0x102] = imm;
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = 0xBA;
      cpu.iram[dir] = y;

      cpu.run1(0x100);              // ANL dir,#imm
      expect(cpu.pc).toBe(0x103);
      expect(cpu.SFR[ACC]).toBe(0xBA);
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
]) ('ANL',
  (x, y, and)  => {
    test(`C,bit ${x}&${y}=${and}`, () => {
      const bit = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x82;       // ANL C,bit
      cpu.code[0x101] = bit;
      cpu.SFR[PSW] = 0;

      cpu.BIT[bit] = y;
      cpu.SFR[ACC] = 0;
      cpu.CY = x;

      cpu.run1(0x100);              // ANL C,bit
      expect(cpu.pc).toBe(0x102);
      expect(cpu.CY).toBe(and);
      expect(cpu.AC).toBe(0);
      expect(cpu.SFR[ACC]).toBe(0);
      expect(cpu.BIT[bit]).toBe(y);
    });
  });


//////////////// ANL C,/src ////////////////
describe.each([
  // x   y  and
  [  0,  0,  0],
  [  0,  1,  0],
  [  1,  0,  1],
  [  1,  1,  0],
]) ('ANL',
    (x, y, and)  => {
      test(`ANL C,/bit ${x}&/${y}=${and}`, () => {
        const bit = 0x42;
        clearIRAM();
        cpu.code[0x100] = 0xB0;       // ANL C,bit
        cpu.code[0x101] = bit;
        cpu.SFR[PSW] = 0;

        cpu.BIT[bit] = y;
        cpu.SFR[ACC] = 0;
        cpu.CY = x;

        cpu.run1(0x100);              // ANL C,bit
        expect(cpu.pc).toBe(0x102);
        expect(cpu.CY).toBe(and);
        expect(cpu.AC).toBe(0);
        expect(cpu.SFR[ACC]).toBe(0);
        expect(cpu.BIT[bit]).toBe(y);
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
]) (
  'ORL',
  (x, y, or)  => {

    test(`A,dir ${toHex2(x)}&${toHex2(y)}=${toHex2(or)}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x45;       // ORL A,dir
      cpu.code[0x101] = dir;

      cpu.iram[dir] = x;

      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);              // ORL A,dir
      expect(cpu.pc).toBe(0x102);
      expect(cpu.SFR[ACC]).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[dir]).toBe(x);
    });

    test(`A,Rn ${toHex2(x)}+${toHex2(y)}=${toHex2(or)}`, () => {
      cpu.SFR[PSW] = 0;
      cpu.code[0x100] = 0x4B;       // ORL A,R3
      cpu.iram[3] = x;              // R3
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);              // ORL A,R3
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[3]).toBe(x);
    });

    test(`A,@Ri ${toHex2(x)}+${toHex2(y)}=${toHex2(or)}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x47;       // ORL A,@R1
      cpu.iram[1] = dir;            // Set R1=dir for @R1
      cpu.iram[dir] = x;

      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);              // ORL A,@R1
      expect(cpu.pc).toBe(0x101);
      expect(cpu.SFR[ACC]).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
      expect(cpu.iram[1]).toBe(dir);
      expect(cpu.iram[dir]).toBe(x);
    });

    test(`A,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(or)}`, () => {
      const imm = x;
      clearIRAM();
      cpu.code[0x100] = 0x44;       // ORL A,#imm
      cpu.code[0x101] = imm;

      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);              // ORL A,#imm
      expect(cpu.pc).toBe(0x102);
      expect(cpu.SFR[ACC]).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });

    test(`dir,A ${toHex2(x)}+${toHex2(y)}=${toHex2(or)}`, () => {
      const dir = 0x42;
      clearIRAM();
      cpu.code[0x100] = 0x42;       // ORL dir,A
      cpu.code[0x101] = dir;

      cpu.SFR[PSW] = 0;
      cpu.iram[dir] = x;
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);              // ORL dir,A
      expect(cpu.pc).toBe(0x102);
      expect(cpu.SFR[ACC]).toBe(y);
      expect(cpu.iram[dir]).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });

    test(`ORL dir,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(or)}`, () => {
      const dir = 0x42;
      const imm = x;
      clearIRAM();
      cpu.code[0x100] = 0x43;       // ORL dir,#imm
      cpu.code[0x101] = dir;
      cpu.code[0x102] = imm;
      cpu.iram[dir] = y;
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = 0xDA;

      cpu.run1(0x100);              // ORL dir,#imm
      expect(cpu.pc).toBe(0x103);
      expect(cpu.SFR[ACC]).toBe(0xDA);
      expect(cpu.iram[dir]).toBe(or);
      expect(cpu.CY).toBe(0);
      expect(cpu.AC).toBe(0);
    });
  });


//////////////// ORL C,src ////////////////
describe.each([
  // x   y  or
  [  0,  0,  0],
  [  0,  1,  0],
  [  1,  0,  0],
  [  1,  1,  1],
]) ('ORL',
  (x, y, or)  => {
    test(`C,bit ${x}&${y}=${or}`, () => {
      const bit = 0x72;
      clearIRAM();
      cpu.code[0x100] = 0x82;       // ORL C,bit
      cpu.code[0x101] = bit;
      cpu.SFR[PSW] = 0;

      cpu.BIT[bit] = y;
      cpu.SFR[ACC] = 0;
      cpu.CY = x;

      cpu.run1(0x100);              // ORL C,bit
      expect(cpu.pc).toBe(0x102);
      expect(cpu.CY).toBe(or);
      expect(cpu.AC).toBe(0);
      expect(cpu.SFR[ACC]).toBe(0);
      expect(cpu.BIT[bit]).toBe(y);
    });
  });


//////////////// ORL C,/src ////////////////
describe.each([
  // x   y  or
  [  0,  0,  1],
  [  0,  1,  0],
  [  1,  0,  1],
  [  1,  1,  1],
]) ('ORL',
    (x, y, or)  => {
      test(`ORL C,/bit ${x}&/${y}=${or}`, () => {
        const bit = 0xA0;
        clearIRAM();
        cpu.code[0x100] = 0xA0;       // ORL C,/bit
        cpu.code[0x101] = bit;
        cpu.SFR[PSW] = 0;

        cpu.BIT[bit] = y;
        cpu.SFR[ACC] = 0;
        cpu.CY = x;

        cpu.run1(0x100);              // ORL C,/bit
        expect(cpu.pc).toBe(0x102);
        expect(cpu.CY).toBe(or);
        expect(cpu.AC).toBe(0);
        expect(cpu.SFR[ACC]).toBe(0);
        expect(cpu.BIT[bit]).toBe(y);
      });
    });


describe('POP', () => {

  test('dir', () => {
    const dir = 0x42;
    const spBase = 0x20;
    clearIRAM();
    cpu.code[0x100] = 0xD0;     // POP dir
    cpu.code[0x101] = dir;
    cpu.iram[spBase] = 0xFE;
    cpu.iram[dir] = 0xAA;
    cpu.SFR[SP] = spBase;
    cpu.SFR[PSW] = 0;
    cpu.SFR[ACC] = 0xCD;

    cpu.run1(0x100);            // POP
    expect(cpu.pc).toBe(0x102);
    expect(cpu.SFR[SP]).toBe(spBase - 1);
    expect(cpu.iram[dir]).toBe(0xFE);
    expect(cpu.SFR[ACC]).toBe(0xCD);
    expect(cpu.SFR[PSW]).toBe(0);
  });
});


describe('PUSH', () => {

  test('dir', () => {
    const dir = 0x42;
    const spBase = 0x20;
    clearIRAM();
    cpu.code[0x100] = 0xC0;     // PUSH dir
    cpu.code[0x101] = dir;
    cpu.iram[dir] = 0x73;
    cpu.SFR[SP] = spBase;
    cpu.SFR[PSW] = 0;
    cpu.SFR[ACC] = 0xCD;

    cpu.run1(0x100);            // POP
    expect(cpu.pc).toBe(0x102);
    expect(cpu.SFR[SP]).toBe(spBase + 1);
    expect(cpu.iram[spBase + 1]).toBe(0x73);
    expect(cpu.SFR[ACC]).toBe(0xCD);
    expect(cpu.SFR[PSW]).toBe(0);
  });
});


function clearCode() {
  cpu.code.fill(0x00, 0x00, cpu.code.length);
}


function clearXRAM() {
  cpu.xram.fill(0x00, 0x00, cpu.xram.length);
}


function clearIRAM() {
  cpu.iram.fill(0x00, 0x00, 0x80);
}
