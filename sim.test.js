const SIM = require('./sim');
const {toHex1, toHex2, toHex4} = require('./simutils');
const CPU = require('./cpu');

const cpu = SIM.cpu;

// Define each SFR address globally
Object.keys(CPU.SFRs).forEach(name => global[name] = CPU.SFRs[name]);


//////////// NOP ////////////
test('NOP', () => {
  cpu.code[0x100] = 0x00;       // NOP
  cpu.SFR[ACC] = 0x42;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.SFR[PSW]).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x42);
});

//////////// ACALL ////////////
describe.each([0, 1, 2, 3, 4, 5, 6, 7])('ACALL', fromPage => {

  test(`ACALL from page${fromPage}`, () => {
    const pageOffset = 0x24;
    const callBase = fromPage * 0x100 + 0x42;

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


//////////// AJMP ////////////
describe.each([0, 1, 2, 3, 4, 5, 6, 7])('AJMP', fromPage => {

  test(`AJMP from page${fromPage}`, () => {
    const pageOffset = 0x24;
    const jmpBase = fromPage * 0x100 + 0x42;
    const spBase = 0x07;
    const acBase = 0x42;

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
  'CJNE:',
  (x, y, ltCY, rela, jump)  => {
    test(`\
CJNE A,dir,rel A=${toHex2(x)} dir=${toHex2(y)}, \
ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`,
         () => {
           const dir = 0x42;
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
    test(`\
CJNE A,#imm,rel A=${toHex2(x)} dir=${toHex2(y)}, \
ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`,
         () => {
           const imm = y;
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
    test(`\
CJNE R3,#imm,rel A=${toHex2(x)} dir=${toHex2(y)}, \
ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`,
         () => {
           const imm = y;
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
    test(`\
CJNE @R1,#imm,rel A=${toHex2(x)} dir=${toHex2(y)}, \
ltCY=${ltCY}) rela=${toHex2(rela)} jump=${jump}`,
         () => {
           const imm = y;
           const dir = 0x42;
           cpu.code[0x100] = 0xBB;       // CJNE R3,#imm,rela
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
  'DJNZ:',
  (x, y, jump)  => {
    test(`DJNZ dir,rel dir=${toHex2(y)}, jump=${jump}`, () => {
      const dir = 0x42;
      const acBase = 0xAA;
      const rela = -0x10 & 0xFF;
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


//////////// JNB ////////////b
test(`JNB bit,rel bit=0`, () => {
  const bit = 0x42;
  const acBase = 0x55;
  const rela = -0x13 & 0xFF;
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


//////////// CLR A ////////////
test('CLR A', () => {
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
  cpu.code[0x100] = 0xC3;       // CLR C
  cpu.SFR[ACC] = 0x42;
  cpu.SFR[PSW] = 0;
  cpu.CY = 1;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.CY).toBe(0);
  expect(cpu.AC).toBe(0);
});

//////////// CPL A ////////////
test('CPL A', () => {
  const acBase = 0x42;
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
  'DEC:',
  (x, dec)  => {
    test(`DEC A A=${toHex2(x)}, result=${toHex2(dec)}`,
         () => {
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
    test(`DEC R3, R3=${toHex2(x)} result=${toHex2(dec)}`,
         () => {
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
    test(`DEC dir, dir=${toHex2(x)} result=${toHex2(dec)}`,
         () => {
           const dir = 0x42;
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
    test(`DEC @R1 x=${toHex2(x)}, result=${toHex2(dec)}`,
         () => {
           const dir = 0x42;
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
  'DIV AB:',
  (x, y, div, rem, ov)  => {
    test(`\
DIV AB A=${toHex2(x)}, B=${toHex2(y)}, \
div=${toHex2(div)} rem=${toHex2(rem)}, ov=${ov}`,
         () => {
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
  'INC:',
  (x, inc)  => {
    test(`INC A A=${toHex2(x)}, result=${toHex2(inc)}`,
         () => {
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
    test(`INC R3, R3=${toHex2(x)} result=${toHex2(inc)}`,
         () => {
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
    test(`INC dir, dir=${toHex2(x)} result=${toHex2(inc)}`,
         () => {
           const dir = 0x42;
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
    test(`INC @R1 x=${toHex2(x)}, result=${toHex2(inc)}`,
         () => {
           const dir = 0x42;
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
  'INC DPTR:',
  (x, inc)  => {
    test(`INC DPTR DPTR=${toHex2(x)}, result=${toHex2(inc)}`,
         () => {
           const acBase = 0xAA;
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
  'DIV AB:',
  (x, y, div, rem, ov)  => {
    test(`\
DIV AB A=${toHex2(x)}, B=${toHex2(y)}, \
div=${toHex2(div)} rem=${toHex2(rem)}, ov=${ov}`,
         () => {
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


//////////// RLC ////////////
test('RLC A=0x80,CY=0 = A=00,CY=1', () => {
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
  'ADD:',
  (inCY, x, y, addSum, addCY, addAC)  => {
    test(`ADD A,dir ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`,
         () => {
           const dir = 0x42;
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
    test(`ADD A,Rn ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`,
         () => {
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
    test(`ADD A,@Ri ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`,
         () => {
           const dir = 0x42;
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
    test(`ADD A,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(addSum)},CY=${addCY}`,
         () => {
           const imm = x;
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
  'ADDC:',
  (inCY, x, y, addSum, addCY, addAC)  => {
    test(`${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`,
         () => {
           const dir = 0x42;
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
    test(`ADDC A,Rn ${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`,
         () => {
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
    test(`ADDC A,@Ri ${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`,
         () => {
           const dir = 0x42;
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
    test(`ADDC A,#imm ${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(addSum)},CY=${addCY}`,
         () => {
           const imm = x;
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
]) (
  'decimal addition:',
  (inCY, x, y, addSum, addCY, addAC, daSum, daCY)  => {
    test(`${toHex2(x)}+${toHex2(y)},CY=${inCY}=${toHex2(daSum)},CY=${daCY}`,
         () => {
           const dir = 0x42;
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
         })
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
  'ANL:',
  (x, y, and)  => {
    test(`ANL A,dir ${toHex2(x)}&${toHex2(y)}=${toHex2(and)}`,
         () => {
           const dir = 0x42;
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
    test(`ANL A,Rn ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`,
         () => {
           cpu.SFR[PSW] = 0;
           cpu.code[0x100] = 0x5B;       // ANL A,R3
           cpu.iram[3] = x;              // R3
           cpu.SFR[ACC] = y;

           cpu.run1(0x100);              // ANL A,R3
           expect(cpu.pc).toBe(0x101);
           expect(cpu.SFR[ACC]).toBe(and);
           expect(cpu.CY).toBe(0);
//           expect(cpu.AC).toBe(0);
           expect(cpu.iram[3]).toBe(x);
         });
    test(`ANL A,@Ri ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`,
         () => {
           const dir = 0x42;
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
    test(`ANL A,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`,
         () => {
           const imm = x;
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
    test(`ANL dir,A ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`,
         () => {
           const dir = 0x42;
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
    test(`ANL dir,#imm ${toHex2(x)}+${toHex2(y)}=${toHex2(and)}`,
         () => {
           const dir = 0x42;
           const imm = x;
           cpu.code[0x100] = 0x53;       // ANL dir,#imm
           cpu.code[0x101] = dir;
           cpu.code[0x102] = imm;

           cpu.SFR[PSW] = 0;
           cpu.SFR[ACC] = y;

           cpu.run1(0x100);              // ANL dir,#imm
           expect(cpu.pc).toBe(0x103);
           expect(cpu.SFR[ACC]).toBe(y);
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
]) (
  'ANL:',
  (x, y, and)  => {
    test(`ANL C,bit ${x}&${y}=${and}`,
         () => {
           const bit = 0x42;
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
]) (
  'ANL:',
  (x, y, and)  => {
    test(`ANL C,/bit ${x}&/${y}=${and}`,
         () => {
           const bit = 0x42;
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


