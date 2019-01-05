const sim = require('./sim');

const cpu = sim.cpu;

// Define each SFR address globally
Object.keys(sim.SFRs).forEach(name => global[name] = sim.SFRs[name]);


//////////// NOP ////////////
test('NOP', () => {
  cpu.pmem[0x100] = 0x00;       // NOP
  cpu.SFR[ACC] = 0x42;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.SFR[PSW]).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x42);
});

//////////// ACALL ////////////
for (let fromPage = 0; fromPage < 8; ++fromPage) {

  test(`ACALL from page${fromPage}`, () => {
    const pageOffset = 0x24;
    const callBase = fromPage * 0x100 + 0x42;

    for (let toPage = 0; toPage < 8; ++toPage) {
      const callTarget = (toPage * 0x100) + pageOffset;
      cpu.pmem[callBase] = (toPage * 0x20) + 0x11;      // ACALL pageN
      cpu.pmem[callBase + 1] = pageOffset;
      cpu.pmem[callTarget] = 0x22;                      // RET

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
      cpu.pmem[callTarget] = 0x00;
    }
  });
}


//////////// RLC ////////////
test('RLC A=0x80,CY=0 = A=00,CY=1', () => {
  cpu.pmem[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x80;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(1);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x00);
});

test('RLC A=0x08,CY=0 = A=10,CY=0', () => {
  cpu.pmem[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x08;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(0);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x10);
});

test('RLC A=0x80,CY=1 = A=01,CY=1', () => {
  cpu.pmem[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x80;
  cpu.SFR[PSW] = 0;
  cpu.putCY(1);

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(1);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x01);
});

test('RLC A=0x08,CY=1 = A=11,CY=0', () => {
  cpu.pmem[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x08;
  cpu.SFR[PSW] = 0;
  cpu.putCY(1);

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(0);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x11);
});

test('RLC CY=1 bit walk', () => {
  cpu.pmem[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x00;
  cpu.SFR[PSW] = 0;
  cpu.putCY(1);

  for (let k = 0; k < 8; ++k) {
    cpu.run1(0x100);
    expect(cpu.pc).toBe(0x101);
    expect(cpu.getCY()).toBe(0);
    expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
    expect(cpu.SFR[ACC]).toBe(0x01 << k);
  }

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(1);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x00);
});


//////////// RRC ////////////
test('RRC A=0x01,CY=0 = A=00,CY=1', () => {
  cpu.pmem[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x01;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(1);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x00);
});

test('RRC A=0x08,CY=0 = A=04,CY=0', () => {
  cpu.pmem[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x08;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(0);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x04);
});

test('RRC A=0x80,CY=1 = A=C0,CY=0', () => {
  cpu.pmem[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x80;
  cpu.SFR[PSW] = 0;
  cpu.putCY(1);

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(0);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0xC0);
});

test('RRC A=0x08,CY=1 = A=84,CY=0', () => {
  cpu.pmem[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x08;
  cpu.SFR[PSW] = 0;
  cpu.putCY(1);

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(0);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x84);
});

test('RRC CY=1 bit walk', () => {
  cpu.pmem[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x00;
  cpu.SFR[PSW] = 0;
  cpu.putCY(1);

  for (let k = 0; k < 8; ++k) {
    cpu.run1(0x100);
    expect(cpu.pc).toBe(0x101);
    expect(cpu.getCY()).toBe(0);
    expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
    expect(cpu.SFR[ACC]).toBe(0x80 >>> k);
  }

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(1);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x00);
});


//////////////// DA ////////////////
function testADDC_DA(x, y) {
  const dir = 0x42;
  cpu.pmem[0x100] = 0x35;       // ADDC A,dir
  cpu.pmem[0x101] = dir;
  cpu.pmem[0x102] = 0xD4;       // DA A

  cpu.iram[dir] = x;

  const addcSum = x + y;
  const bcdsum = +('0x' + (+x.toString(16) + +y.toString(16)));
  cpu.SFR[PSW] = 0;
  cpu.SFR[ACC] = y;

  cpu.run1(0x100);          // ADDC
  expect(cpu.pc).toBe(0x102);
  expect(cpu.SFR[ACC]).toBe(addcSum & 0xFF);
  expect(cpu.getCY()).toBe(+(addcSum > 0xFF));

  cpu.run1(cpu.pc);         // DA
  expect(cpu.pc).toBe(0x103);
  expect(cpu.getCY()).toBe(+(bcdsum >>> 8 != 0));
  expect(cpu.SFR[ACC]).toBe(bcdsum & 0xFF);
}


test(`ADDC/DA 0x00+0x00=0x00,CY=0`, () => testADDC_DA(0x00, 0x00));
test(`ADDC/DA 0x02+0x02=0x04,CY=0`, () => testADDC_DA(0x02, 0x02));
test(`ADDC/DA 0x77+0x41=0x18,CY=1`, () => testADDC_DA(0x77, 0x41));
test(`ADDC/DA 0x37+0x41=0x78,CY=0`, () => testADDC_DA(0x37, 0x41));
test(`ADDC/DA 0x57+0x73=0x30,CY=1`, () => testADDC_DA(0x57, 0x73));
test(`ADDC/DA 0x77+0x47=0x24,CY=1`, () => testADDC_DA(0x77, 0x47));
test(`ADDC/DA 0x08+0x08=0x16,CY=0`, () => testADDC_DA(0x08, 0x08));
