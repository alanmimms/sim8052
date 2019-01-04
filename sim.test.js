const sim = require('./sim');

const cpu = sim.cpu;

// Define each SFR address globally
Object.keys(sim.SFRs).forEach(name => global[name] = sim.SFRs[name]);


test('should run RLC A=0x80,CY=0 and produce A=00 and CY=1', () => {
  cpu.pmem[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x80;
  cpu.SFR[PSW] = 0;

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(1);
  expect(cpu.SFR[ACC]).toBe(0x00);
});


test('should run RLC A=0x80,CY=1 and produce A=01 and CY=1', () => {
  cpu.pmem[0x100] = 0x33;       // RLC A
  cpu.SFR[ACC] = 0x80;
  cpu.SFR[PSW] = 0;
  cpu.putCY(1);

  cpu.run1(0x100);
  expect(cpu.pc).toBe(0x101);
  expect(cpu.getCY()).toBe(1);
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
  expect(cpu.SFR[ACC]).toBe(0x11);
});
