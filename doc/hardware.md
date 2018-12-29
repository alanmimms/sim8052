# Hardware modules

## Blocks
* RAR: RAM Address Register
* ROM: Read Only Memory (Program)
* RAM: Internal RAM
* P0L: Port 0 Latch
* P1L: Port 1 Latch
* P2L: Port 2 Latch
* P3L: Port 3 Latch
* SP: Stack Pointer
* ACC: Accumulator
* BR: B Register
* TMP1: ALU Temporary #1
* TMP2: ALU Temporary #2
* ALU: Arithmetic and Logic Unit
* PSW: Program Status Word
* IR: Instruction Register
* PAR: Program Address Register
* PC: Program Counter
* PCI: Program Counter Incrementer
* DPTR: Data Pointer
* HLB: High/Low Buffer

* Miscellaneous blocks for interrupt, serial, timer, system control



## Busses

### Data
* BYTE: 8-bit Bus
* ADDR: 16-bit Bus
* PAB: Program Address Bus
* RAB: RAM Address Bus
* AT2: Accumulator to TMP2

### Control
* T1M: ALU Temporary #1 Mode
  * PASS: Latch and Pass-through
  * OUT1: Output 0x01
  * OUTFF: Output 0xFF

* T2M: ALU Temporary #2 Mode
  * PASS: Latch and Pass-through

* ALUM: ALU Mode
  * ADD: Add A+B


# Execution cycles



# INC A

* S1.1
  * PC -> ADDR
  * PAB <- ADDR
  * PCI <- ADDR

* S1.2
  * ROM[PAB] -> BYTE
  * IR <- BYTE
  * PCI -> ADDR
  * PC <- ADDR

* S2.1
  * ACC -> AT2
  * TMP2 <- AT2
  * T1M <- OUT1
  * T2M <- PASS
  * ALUM <- ADD
  * ALU -> BYTE

* S2.2
  * ACC <- BYTE

* S3.1
* S3.2
* S4.1
* S4.2
* S5.1
* S5.2
* S6.1
* S6.2


# ADD A,#imm

* S1.1
  * PC -> ADDR
  * PAB <- ADDR
  * PCI <- ADDR

* S1.2
  * ROM[PAB] -> BYTE
  * IR <- BYTE
  * PCI -> ADDR
  * PC <- ADDR

* S2.1
  * ACC -> AT2
  * TMP2 <- AT2
  * T2M <- PASS
  * PC -> ADDR
  * PAR <- ADDR

* S2.2
  * ROM[PAB] -> BYTE
  * TMP1 <- BYTE
  * T1M <- PASS
  * ALUM <- ADD

* S3.1
  * ALU -> BYTE
  * ACC <- BYTE
  * PCI -> ADDR
  * PC <- ADDR
  * PAR <- ADDR

* S3.2
  * PC -> ADDR
  * PAR -> PAB
  * ROM[PAB] -> BYTE
  * IR <- BYTE

* S4.1
* S4.2
* S5.1
* S5.2
* S6.1
* S6.2
