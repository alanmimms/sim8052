const sim = require('./sim');

const cpu = sim.cpu;

// Define each SFR address globally
Object.keys(sim.SFRs).forEach(name => global[name] = sim.SFRs[name]);


//////////// RLC ////////////
test('should run RLC A=0x80,CY=0 and produce A=00 and CY=1', () => {
  cpu.pmem[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x80;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(1);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x00);
});

test('should run RLC A=0x08,CY=0 and produce A=10 and CY=0', () => {
  cpu.pmem[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x08;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(0);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x10);
});

test('should run RLC A=0x80,CY=1 and produce A=01 and CY=1', () => {
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

test('should run RLC A=0x08,CY=1 and produce A=11 and CY=0', () => {
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

test('should walk bit through RLC as CY=1 and eventually arriving again in CY=1', () => {
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
test('should run RRC A=0x01,CY=0 and produce A=00 and CY=1', () => {
  cpu.pmem[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x01;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(1);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x00);
});

test('should run RRC A=0x08,CY=0 and produce A=04 and CY=0', () => {
  cpu.pmem[0x100] = 0x13;       // RRC A
  cpu.SFR[ACC] = 0x08;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(0);
  expect(cpu.SFR[PSW] & ~sim.pswBits.cyMask).toBe(0);
  expect(cpu.SFR[ACC]).toBe(0x04);
});

test('should run RRC A=0x80,CY=1 and produce A=C0 and CY=0', () => {
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

test('should run RRC A=0x08,CY=1 and produce A=84 and CY=0', () => {
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

test('should walk bit through RRC as CY=1 and eventually arriving again in CY=1', () => {
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
test(`should properly ADDC/DA CY=0,AC=0`, () => {
  const dir = 0x42;
  cpu.pmem[0x100] = 0x35;       // ADDC A,dir
  cpu.pmem[0x101] = dir;
  cpu.pmem[0x102] = 0xD4;       // DA A

  for (let x = 0; x < 0x100; x += 13) {
    cpu.iram[dir] = x;

    for (let y = 0; y < 100; y += 17) {
      const sum = x + y;
      const digits = [sum % 10,
                      Math.floor(sum / 10) % 10,
                      Math.floor(sum / 100)];
      cpu.SFR[PSW] = 0;
      cpu.SFR[ACC] = y;

      cpu.run1(0x100);          // ADDC
      expect(cpu.pc).toBe(0x102);
      expect(cpu.SFR[ACC]).toBe(sum & 0xFF);
      expect(cpu.getCY()).toBe(+(sum > 0xFF));

      cpu.run1(cpu.pc);         // DA
      expect(cpu.pc).toBe(0x103);
      //      expect(cpu.getCY()).toBe(+(digits[2] != 0));
      expect(cpu.SFR[ACC]).toBe((digits[1]<<4) | digits[0]);
    }
  }
});


