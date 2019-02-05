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

           cpu.run1(0x100);              // ADD A,dir
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
