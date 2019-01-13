'use strict';

// For `put` style functions, convention is put(address, value).
// For `get` convention is get(address).

const fs = require('fs');
const util = require('util');
const _ = require('lodash');
const readline = require('readline');


const debugBASIC2 = false;
const debugTB51 = true;


const insnsPerTick = 100;

const CODESize = 65536;
const XRAMSize = 65536;


function toHex1(v) {
  return (v & 0x0F).toString(16).toUpperCase();
}

function toHex2(v) {
  return (v | 0x100).toString(16).toUpperCase().slice(-2);
}

function toHex4(v) {
  return toHex2(v >>> 8) + toHex2(v & 0xFF);
}



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


const ACC = SFRs.ACC;
const B = SFRs.B;
const SP = SFRs.SP;
const P0 = SFRs.P0;
const P1 = SFRs.P1;
const P2 = SFRs.P2;
const P3 = SFRs.P3;
const IP = SFRs.IP;
const IE = SFRs.IE;
const TMOD = SFRs.TMOD;
const TCON = SFRs.TCON;
const T2CON = SFRs.T2CON;
const T2MOD = SFRs.T2MOD;
const TH0 = SFRs.TH0;
const TL0 = SFRs.TL0;
const TH1 = SFRs.TH1;
const TL1 = SFRs.TL1;
const TH2 = SFRs.TH2;
const TL2 = SFRs.TL2;
const RCAP2H = SFRs.RCAP2H;
const RCAP2L = SFRs.RCAP2L;
const PCON = SFRs.PCON;
const PSW = SFRs.PSW;
const DPL = SFRs.DPL;
const DPH = SFRs.DPH;
const SCON = SFRs.SCON;
const SBUF = SFRs.SBUF;


// Define opcodes. The `operands` string is a sequence of zero or more
// comma-separated elements of the form <digit> ":" <addr-mode> are
// replaced with the disassembly of the specified addressing mode at
// offset <digit> in the instruction. All elements not of this form
// are copied verbatim, as is the comma. See `disassemble()` and its
// `handlers` for details.
const opTable = [
  /* 00 */ {n: 1, name: "NOP",   operands: ""},
  /* 01 */ {n: 2, name: "AJMP",  operands: "1:addr11"},
  /* 02 */ {n: 3, name: "LJMP",  operands: "1:addr16"},
  /* 03 */ {n: 1, name: "RR",    operands: "A"},
  /* 04 */ {n: 1, name: "INC",   operands: "A"},
  /* 05 */ {n: 2, name: "INC",   operands: "1:direct"},
  /* 06 */ {n: 1, name: "INC",   operands: "@R0"},
  /* 07 */ {n: 1, name: "INC",   operands: "@R1"},
  /* 08 */ {n: 1, name: "INC",   operands: "R0"},
  /* 09 */ {n: 1, name: "INC",   operands: "R1"},
  /* 0A */ {n: 1, name: "INC",   operands: "R2"},
  /* 0B */ {n: 1, name: "INC",   operands: "R3"},
  /* 0C */ {n: 1, name: "INC",   operands: "R4"},
  /* 0D */ {n: 1, name: "INC",   operands: "R5"},
  /* 0E */ {n: 1, name: "INC",   operands: "R6"},
  /* 0F */ {n: 1, name: "INC",   operands: "R7"},
  /* 10 */ {n: 3, name: "JBC",   operands: "1:bit,2:rela"},
  /* 11 */ {n: 2, name: "ACALL", operands: "1:addr11"},
  /* 12 */ {n: 3, name: "LCALL", operands: "1:addr16"},
  /* 13 */ {n: 1, name: "RRC",   operands: "A"},
  /* 14 */ {n: 1, name: "DEC",   operands: "A"},
  /* 15 */ {n: 2, name: "DEC",   operands: "1:direct"},
  /* 16 */ {n: 1, name: "DEC",   operands: "@R0"},
  /* 17 */ {n: 1, name: "DEC",   operands: "@R1"},
  /* 18 */ {n: 1, name: "DEC",   operands: "R0"},
  /* 19 */ {n: 1, name: "DEC",   operands: "R1"},
  /* 1A */ {n: 1, name: "DEC",   operands: "R2"},
  /* 1B */ {n: 1, name: "DEC",   operands: "R3"},
  /* 1C */ {n: 1, name: "DEC",   operands: "R4"},
  /* 1D */ {n: 1, name: "DEC",   operands: "R5"},
  /* 1E */ {n: 1, name: "DEC",   operands: "R6"},
  /* 1F */ {n: 1, name: "DEC",   operands: "R7"},
  /* 20 */ {n: 3, name: "JB",    operands: "1:bit,2:rela"},
  /* 21 */ {n: 2, name: "AJMP",  operands: "1:addr11"},
  /* 22 */ {n: 1, name: "RET",   operands: ""},
  /* 23 */ {n: 1, name: "RL",    operands: "A"},
  /* 24 */ {n: 2, name: "ADD",   operands: "A,1:immed"},
  /* 25 */ {n: 2, name: "ADD",   operands: "A,1:direct"},
  /* 26 */ {n: 1, name: "ADD",   operands: "A,@R0"},
  /* 27 */ {n: 1, name: "ADD",   operands: "A,@R1"},
  /* 28 */ {n: 1, name: "ADD",   operands: "A,R0"},
  /* 29 */ {n: 1, name: "ADD",   operands: "A,R1"},
  /* 2A */ {n: 1, name: "ADD",   operands: "A,R2"},
  /* 2B */ {n: 1, name: "ADD",   operands: "A,R3"},
  /* 2C */ {n: 1, name: "ADD",   operands: "A,R4"},
  /* 2D */ {n: 1, name: "ADD",   operands: "A,R5"},
  /* 2E */ {n: 1, name: "ADD",   operands: "A,R6"},
  /* 2F */ {n: 1, name: "ADD",   operands: "A,R7"},
  /* 30 */ {n: 3, name: "JNB",   operands: "1:bit,2:rela"},
  /* 31 */ {n: 2, name: "ACALL", operands: "1:addr11"},
  /* 32 */ {n: 1, name: "RETI",  operands: ""},
  /* 33 */ {n: 1, name: "RLC",   operands: "A"},
  /* 34 */ {n: 2, name: "ADDC",  operands: "A,1:immed"},
  /* 35 */ {n: 2, name: "ADDC",  operands: "A,1:direct"},
  /* 36 */ {n: 1, name: "ADDC",  operands: "A,@R0"},
  /* 37 */ {n: 1, name: "ADDC",  operands: "A,@R1"},
  /* 38 */ {n: 1, name: "ADDC",  operands: "A,R0"},
  /* 39 */ {n: 1, name: "ADDC",  operands: "A,R1"},
  /* 3A */ {n: 1, name: "ADDC",  operands: "A,R2"},
  /* 3B */ {n: 1, name: "ADDC",  operands: "A,R3"},
  /* 3C */ {n: 1, name: "ADDC",  operands: "A,R4"},
  /* 3D */ {n: 1, name: "ADDC",  operands: "A,R5"},
  /* 3E */ {n: 1, name: "ADDC",  operands: "A,R6"},
  /* 3F */ {n: 1, name: "ADDC",  operands: "A,R7"},
  /* 40 */ {n: 2, name: "JC",    operands: "1:rela"},
  /* 41 */ {n: 2, name: "AJMP",  operands: "1:addr11"},
  /* 42 */ {n: 2, name: "ORL",   operands: "1:direct,A"},
  /* 43 */ {n: 3, name: "ORL",   operands: "1:direct,2:immed"},
  /* 44 */ {n: 2, name: "ORL",   operands: "A,1:immed"},
  /* 45 */ {n: 2, name: "ORL",   operands: "A,1:direct"},
  /* 46 */ {n: 1, name: "ORL",   operands: "A,@R0"},
  /* 47 */ {n: 1, name: "ORL",   operands: "A,@R1"},
  /* 48 */ {n: 1, name: "ORL",   operands: "A,R0"},
  /* 49 */ {n: 1, name: "ORL",   operands: "A,R1"},
  /* 4A */ {n: 1, name: "ORL",   operands: "A,R2"},
  /* 4B */ {n: 1, name: "ORL",   operands: "A,R3"},
  /* 4C */ {n: 1, name: "ORL",   operands: "A,R4"},
  /* 4D */ {n: 1, name: "ORL",   operands: "A,R5"},
  /* 4E */ {n: 1, name: "ORL",   operands: "A,R6"},
  /* 4F */ {n: 1, name: "ORL",   operands: "A,R7"},
  /* 50 */ {n: 2, name: "JNC",   operands: "1:rela"},
  /* 51 */ {n: 2, name: "ACALL", operands: "1:addr11"},
  /* 52 */ {n: 2, name: "ANL",   operands: "1:direct,A"},
  /* 53 */ {n: 3, name: "ANL",   operands: "1:direct,2:immed"},
  /* 54 */ {n: 2, name: "ANL",   operands: "A,1:immed"},
  /* 55 */ {n: 2, name: "ANL",   operands: "A,1:direct"},
  /* 56 */ {n: 1, name: "ANL",   operands: "A,@R0"},
  /* 57 */ {n: 1, name: "ANL",   operands: "A,@R1"},
  /* 58 */ {n: 1, name: "ANL",   operands: "A,R0"},
  /* 59 */ {n: 1, name: "ANL",   operands: "A,R1"},
  /* 5A */ {n: 1, name: "ANL",   operands: "A,R2"},
  /* 5B */ {n: 1, name: "ANL",   operands: "A,R3"},
  /* 5C */ {n: 1, name: "ANL",   operands: "A,R4"},
  /* 5D */ {n: 1, name: "ANL",   operands: "A,R5"},
  /* 5E */ {n: 1, name: "ANL",   operands: "A,R6"},
  /* 5F */ {n: 1, name: "ANL",   operands: "A,R7"},
  /* 60 */ {n: 2, name: "JZ",    operands: "1:rela"},
  /* 61 */ {n: 2, name: "AJMP",  operands: "1:addr11"},
  /* 62 */ {n: 2, name: "XRL",   operands: "1:direct,A"},
  /* 63 */ {n: 3, name: "XRL",   operands: "1:direct,2:immed"},
  /* 64 */ {n: 2, name: "XRL",   operands: "A,1:immed"},
  /* 65 */ {n: 2, name: "XRL",   operands: "A,1:direct"},
  /* 66 */ {n: 1, name: "XRL",   operands: "A,@R0"},
  /* 67 */ {n: 1, name: "XRL",   operands: "A,@R1"},
  /* 68 */ {n: 1, name: "XRL",   operands: "A,R0"},
  /* 69 */ {n: 1, name: "XRL",   operands: "A,R1"},
  /* 6A */ {n: 1, name: "XRL",   operands: "A,R2"},
  /* 6B */ {n: 1, name: "XRL",   operands: "A,R3"},
  /* 6C */ {n: 1, name: "XRL",   operands: "A,R4"},
  /* 6D */ {n: 1, name: "XRL",   operands: "A,R5"},
  /* 6E */ {n: 1, name: "XRL",   operands: "A,R6"},
  /* 6F */ {n: 1, name: "XRL",   operands: "A,R7"},
  /* 70 */ {n: 2, name: "JNZ",   operands: "1:rela"},
  /* 71 */ {n: 2, name: "ACALL", operands: "1:addr11"},
  /* 72 */ {n: 2, name: "ORL",   operands: "C,1:bit"},
  /* 73 */ {n: 1, name: "JMP",   operands: "@A+DPTR"},
  /* 74 */ {n: 2, name: "MOV",   operands: "A,1:immed"},
  /* 75 */ {n: 3, name: "MOV",   operands: "1:direct,2:immed"},
  /* 76 */ {n: 2, name: "MOV",   operands: "@R0,1:immed"},
  /* 77 */ {n: 2, name: "MOV",   operands: "@R1,1:immed"},
  /* 78 */ {n: 2, name: "MOV",   operands: "R0,1:immed"},
  /* 79 */ {n: 2, name: "MOV",   operands: "R1,1:immed"},
  /* 7A */ {n: 2, name: "MOV",   operands: "R2,1:immed"},
  /* 7B */ {n: 2, name: "MOV",   operands: "R3,1:immed"},
  /* 7C */ {n: 2, name: "MOV",   operands: "R4,1:immed"},
  /* 7D */ {n: 2, name: "MOV",   operands: "R5,1:immed"},
  /* 7E */ {n: 2, name: "MOV",   operands: "R6,1:immed"},
  /* 7F */ {n: 2, name: "MOV",   operands: "R7,1:immed"},
  /* 80 */ {n: 2, name: "SJMP",  operands: "1:rela"},
  /* 81 */ {n: 2, name: "AJMP",  operands: "1:addr11"},
  /* 82 */ {n: 2, name: "ANL",   operands: "C,1:bit"},
  /* 83 */ {n: 1, name: "MOVC",  operands: "A,@A+PC"},
  /* 84 */ {n: 1, name: "DIV",   operands: "AB"},
  /* 85 */ {n: 3, name: "MOV",   operands: "2:direct,1:direct"},
  /* 86 */ {n: 2, name: "MOV",   operands: "1:direct,@R0"},
  /* 87 */ {n: 2, name: "MOV",   operands: "1:direct,@R1"},
  /* 88 */ {n: 2, name: "MOV",   operands: "1:direct,R0"},
  /* 89 */ {n: 2, name: "MOV",   operands: "1:direct,R1"},
  /* 8A */ {n: 2, name: "MOV",   operands: "1:direct,R2"},
  /* 8B */ {n: 2, name: "MOV",   operands: "1:direct,R3"},
  /* 8C */ {n: 2, name: "MOV",   operands: "1:direct,R4"},
  /* 8D */ {n: 2, name: "MOV",   operands: "1:direct,R5"},
  /* 8E */ {n: 2, name: "MOV",   operands: "1:direct,R6"},
  /* 8F */ {n: 2, name: "MOV",   operands: "1:direct,R7"},
  /* 90 */ {n: 3, name: "MOV",   operands: "DPTR,1:immed16"},
  /* 91 */ {n: 2, name: "ACALL", operands: "1:addr11"},
  /* 92 */ {n: 2, name: "MOV",   operands: "1:bit,C"},
  /* 93 */ {n: 1, name: "MOVC",  operands: "A,@A+DPTR"},
  /* 94 */ {n: 2, name: "SUBB",  operands: "A,1:immed"},
  /* 95 */ {n: 2, name: "SUBB",  operands: "A,1:direct"},
  /* 96 */ {n: 1, name: "SUBB",  operands: "A,@R0"},
  /* 97 */ {n: 1, name: "SUBB",  operands: "A,@R1"},
  /* 98 */ {n: 1, name: "SUBB",  operands: "A,R0"},
  /* 99 */ {n: 1, name: "SUBB",  operands: "A,R1"},
  /* 9A */ {n: 1, name: "SUBB",  operands: "A,R2"},
  /* 9B */ {n: 1, name: "SUBB",  operands: "A,R3"},
  /* 9C */ {n: 1, name: "SUBB",  operands: "A,R4"},
  /* 9D */ {n: 1, name: "SUBB",  operands: "A,R5"},
  /* 9E */ {n: 1, name: "SUBB",  operands: "A,R6"},
  /* 9F */ {n: 1, name: "SUBB",  operands: "A,R7"},
  /* A0 */ {n: 2, name: "ORL",   operands: "C,1:nbit"},
  /* A1 */ {n: 2, name: "AJMP",  operands: "1:addr11"},
  /* A2 */ {n: 2, name: "MOV",   operands: "C,1:bit"},
  /* A3 */ {n: 1, name: "INC",   operands: "DPTR"},
  /* A4 */ {n: 1, name: "MUL",   operands: "AB"},
  /* A5 */ {n: 1, name: "???",   operands: ""},
  /* A6 */ {n: 2, name: "MOV",   operands: "@R0,1:direct"},
  /* A7 */ {n: 2, name: "MOV",   operands: "@R1,1:direct"},
  /* A8 */ {n: 2, name: "MOV",   operands: "R0,1:direct"},
  /* A9 */ {n: 2, name: "MOV",   operands: "R1,1:direct"},
  /* AA */ {n: 2, name: "MOV",   operands: "R2,1:direct"},
  /* AB */ {n: 2, name: "MOV",   operands: "R3,1:direct"},
  /* AC */ {n: 2, name: "MOV",   operands: "R4,1:direct"},
  /* AD */ {n: 2, name: "MOV",   operands: "R5,1:direct"},
  /* AE */ {n: 2, name: "MOV",   operands: "R6,1:direct"},
  /* AF */ {n: 2, name: "MOV",   operands: "R7,1:direct"},
  /* B0 */ {n: 2, name: "ANL",   operands: "C,1:nbit"},
  /* B1 */ {n: 2, name: "ACALL", operands: "1:addr11"},
  /* B2 */ {n: 2, name: "CPL",   operands: "1:bit"},
  /* B3 */ {n: 1, name: "CPL",   operands: "C"},
  /* B4 */ {n: 3, name: "CJNE",  operands: "A,1:immed,2:rela"},
  /* B5 */ {n: 3, name: "CJNE",  operands: "A,1:direct,2:rela"},
  /* B6 */ {n: 3, name: "CJNE",  operands: "@R0,1:immed,2:rela"},
  /* B7 */ {n: 3, name: "CJNE",  operands: "@R1,1:immed,2:rela"},
  /* B8 */ {n: 3, name: "CJNE",  operands: "R0,1:immed,2:rela"},
  /* B9 */ {n: 3, name: "CJNE",  operands: "R1,1:immed,2:rela"},
  /* BA */ {n: 3, name: "CJNE",  operands: "R2,1:immed,2:rela"},
  /* BB */ {n: 3, name: "CJNE",  operands: "R3,1:immed,2:rela"},
  /* BC */ {n: 3, name: "CJNE",  operands: "R4,1:immed,2:rela"},
  /* BD */ {n: 3, name: "CJNE",  operands: "R5,1:immed,2:rela"},
  /* BE */ {n: 3, name: "CJNE",  operands: "R6,1:immed,2:rela"},
  /* BF */ {n: 3, name: "CJNE",  operands: "R7,1:immed,2:rela"},
  /* C0 */ {n: 2, name: "PUSH",  operands: "1:direct"},
  /* C1 */ {n: 2, name: "AJMP",  operands: "1:addr11"},
  /* C2 */ {n: 2, name: "CLR",   operands: "1:bit"},
  /* C3 */ {n: 1, name: "CLR",   operands: "C"},
  /* C4 */ {n: 1, name: "SWAP",  operands: "A"},
  /* C5 */ {n: 2, name: "XCH",   operands: "A,1:direct"},
  /* C6 */ {n: 1, name: "XCH",   operands: "A,@R0"},
  /* C7 */ {n: 1, name: "XCH",   operands: "A,@R1"},
  /* C8 */ {n: 1, name: "XCH",   operands: "A,R0"},
  /* C9 */ {n: 1, name: "XCH",   operands: "A,R1"},
  /* CA */ {n: 1, name: "XCH",   operands: "A,R2"},
  /* CB */ {n: 1, name: "XCH",   operands: "A,R3"},
  /* CC */ {n: 1, name: "XCH",   operands: "A,R4"},
  /* CD */ {n: 1, name: "XCH",   operands: "A,R5"},
  /* CE */ {n: 1, name: "XCH",   operands: "A,R6"},
  /* CF */ {n: 1, name: "XCH",   operands: "A,R7"},
  /* D0 */ {n: 2, name: "POP",   operands: "1:direct"},
  /* D1 */ {n: 2, name: "ACALL", operands: "1:addr11"},
  /* D2 */ {n: 2, name: "SETB",  operands: "1:bit"},
  /* D3 */ {n: 1, name: "SETB",  operands: "C"},
  /* D4 */ {n: 1, name: "DA",    operands: "A"},
  /* D5 */ {n: 3, name: "DJNZ",  operands: "1:direct,2:rela"},
  /* D6 */ {n: 1, name: "XCHD",  operands: "A,@R0"},
  /* D7 */ {n: 1, name: "XCHD",  operands: "A,@R1"},
  /* D8 */ {n: 2, name: "DJNZ",  operands: "R0,1:rela"},
  /* D9 */ {n: 2, name: "DJNZ",  operands: "R1,1:rela"},
  /* DA */ {n: 2, name: "DJNZ",  operands: "R2,1:rela"},
  /* DB */ {n: 2, name: "DJNZ",  operands: "R3,1:rela"},
  /* DC */ {n: 2, name: "DJNZ",  operands: "R4,1:rela"},
  /* DD */ {n: 2, name: "DJNZ",  operands: "R5,1:rela"},
  /* DE */ {n: 2, name: "DJNZ",  operands: "R6,1:rela"},
  /* DF */ {n: 2, name: "DJNZ",  operands: "R7,1:rela"},
  /* E0 */ {n: 1, name: "MOVX",  operands: "A,@DPTR"},
  /* E1 */ {n: 2, name: "AJMP",  operands: "1:addr11"},
  /* E2 */ {n: 1, name: "MOVX",  operands: "A,@R0"},
  /* E3 */ {n: 1, name: "MOVX",  operands: "A,@R1"},
  /* E4 */ {n: 1, name: "CLR",   operands: "A"},
  /* E5 */ {n: 2, name: "MOV",   operands: "A,1:direct"},
  /* E6 */ {n: 1, name: "MOV",   operands: "A,@R0"},
  /* E7 */ {n: 1, name: "MOV",   operands: "A,@R1"},
  /* E8 */ {n: 1, name: "MOV",   operands: "A,R0"},
  /* E9 */ {n: 1, name: "MOV",   operands: "A,R1"},
  /* EA */ {n: 1, name: "MOV",   operands: "A,R2"},
  /* EB */ {n: 1, name: "MOV",   operands: "A,R3"},
  /* EC */ {n: 1, name: "MOV",   operands: "A,R4"},
  /* ED */ {n: 1, name: "MOV",   operands: "A,R5"},
  /* EE */ {n: 1, name: "MOV",   operands: "A,R6"},
  /* EF */ {n: 1, name: "MOV",   operands: "A,R7"},
  /* F0 */ {n: 1, name: "MOVX",  operands: "@DPTR,A"},
  /* F1 */ {n: 2, name: "ACALL", operands: "1:addr11"},
  /* F2 */ {n: 1, name: "MOVX",  operands: "@R0,A"},
  /* F3 */ {n: 1, name: "MOVX",  operands: "@R1,A"},
  /* F4 */ {n: 1, name: "CPL",   operands: "A"},
  /* F5 */ {n: 2, name: "MOV",   operands: "1:direct,A"},
  /* F6 */ {n: 1, name: "MOV",   operands: "@R0,A"},
  /* F7 */ {n: 1, name: "MOV",   operands: "@R1,A"},
  /* F8 */ {n: 1, name: "MOV",   operands: "R0,A"},
  /* F9 */ {n: 1, name: "MOV",   operands: "R1,A"},
  /* FA */ {n: 1, name: "MOV",   operands: "R2,A"},
  /* FB */ {n: 1, name: "MOV",   operands: "R3,A"},
  /* FC */ {n: 1, name: "MOV",   operands: "R4,A"},
  /* FD */ {n: 1, name: "MOV",   operands: "R5,A"},
  /* FE */ {n: 1, name: "MOV",   operands: "R6,A"},
  /* FF */ {n: 1, name: "MOV",   operands: "R7,A"},
];


const pswBits = makeBits('cy ac f0 rs1 rs0 ov ud p');
const pconBits = makeBits('smod . . . gf1 gf0 pd idl');
const sconBits = makeBits('sm0 sm1 sm2 ren tb8 rb8 ti ri');
const ipBits = makeBits('. . pt2 ps pt1 px1 pt0 px0');
const ieBits = makeBits('ea . et2 es et1 ex1 et0 ex0');
const tmodBits = makeBits('gate1 ct1 t1m1 t1m0 gate0 ct0 t0m1 t0m0');
const tconBits = makeBits('tf1 tr1 tf0 tr0 ie1 it1 ie0 it0');
const t2conBits = makeBits('tf2 exf2 rclk tclk exen2 tr2 ct2 cprl2');


const mathMask = pswBits.ovMask | pswBits.acMask | pswBits.cyMask;
const rsMask = pswBits.rs0Mask | pswBits.rs1Mask;


const parityTable = [
  0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
  1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
  1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
  0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
  1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
  0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
  0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,
  1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,
];


const cpu = {

  // Program counter - invisible to software in most ways
  pc: 0,

  // Internal RAM
  iram: Buffer.alloc(0x100, 0x00, 'binary'),

  // SFRs. Even though this is 256 bytes, only 0x80..0xFF are used.
  SFR: Buffer.alloc(0x100, 0x00, 'binary'),

  // Code (program) memory.
  code: Buffer.alloc(CODESize, 0x00, 'binary'),

  // External (data) memory.
  xram: Buffer.alloc(XRAMSize, 0x00, 'binary'),

  // Interrupt priority level.
  // -1: No interrupt in progress.
  // 0: Low priority in progress.
  // 1: High priority in progress.
  ipl: -1,

  // Serial port input queue
  sbufQueue: [],

  // Simulator state and control
  tracing: false,
  running: true,
  mayDelay: false,

  // Statistics
  instructionsExecuted: 0,
  executionTime: 0,

  debugFlags: `debugSCON debugDirect`.split(/\s+/),

  debugSCON: false,
  debugDirect: false,


  // Trace of PC instruction fetches
  fetchHistoryMask: 255,
  fetchHistory: new Array(256),
  fetchHistoryX: -1,            // Always points to most recent entry


  // Trace of PC changes via jump and call instructions. Each element
  // is an object {from, to} containing the PC values involved.
  branchHistoryMask: 255,
  branchHistory: new Array(256),
  branchHistoryX: -1,           // Always points to most recent entry


  fetch() {
    return this.code[this.pc++];
  },


  getSFR(sfr) {

    switch (sfr) {
    case SBUF:
      return this.sbufQueue.length ? this.sbufQueue.shift() : 0x00;

    case PSW:
      let psw = this.SFR[PSW];

      // Update parity before returning PSW
      if (parityTable[this.SFR[ACC]] << pswBits.pShift)
        psw |= pswBits.pMask;
      else
        psw &= ~pswBits.pMask;

      this.putSFR(PSW, psw);
      return psw;

    case P3:
      let p3 = this.SFR[P3];
      p3 ^= 1;
      this.SFR[P3] = p3;          // Fake RxD toggling
      return p3;

    case SCON:
      return this.SFR[SCON] | +(this.sbufQueue.length !== 0) << sconBits.riShift;
      break;

    default:
      return this.SFR[sfr];
    }
  },


  putSFR(sfr, v) {

    switch (sfr) {
    case SBUF:
      process.stdout.write(String.fromCharCode(v));

      // Transmitting a character immediately signals TI saying it is done.
      this.putDirect(SCON, this.getDirect(SCON) | sconBits.tiMask);

      // TODO: Make this do an interrupt
      break;

    case SCON:
      if (this.debugSCON) console.log(`putDirect SCON now=${toHex2(v)}`);

      // Fall through...
      
    default:
      this.SFR[sfr] = v;
      break;
    }
  },


  getOV() {
    return +!!(this.getSFR(PSW) & pswBits.ovMask);
  },


  getCY() {
    return +!!(this.getSFR(PSW) & pswBits.cyMask);
  },


  getAC() {
    return +!!(this.getSFR(PSW) & pswBits.acMask);
  },


  putCY(v) {
    if (v)
      this.putSFR(PSW, this.getSFR(PSW) | pswBits.cyMask);
    else
      this.putSFR(PSW, this.getSFR(PSW) & ~pswBits.cyMask);
  },


  putOV(v) {
    if (v)
      this.putSFR(PSW, this.getSFR(PSW) | pswBits.ovMask);
    else
      this.putSFR(PSW, this.getSFR(PSW) & ~pswBits.ovMask);
  },


  getDPTR() {
    return this.getSFR(DPH) << 8 | this.getSFR(DPL);
  },


  putDPTR(v) {
    v &= 0xFFFF;
    this.putSFR(DPL, v);
    this.putSFR(DPH, v >>> 8);
  },


  push1(v) {
    const newSP = this.getSFR(SP) + 1;
    this.putDirect(newSP, v);
    this.putSFR(SP, newSP);
  },


  push2(v) {
    const newSP = this.getSFR(SP) + 2;
    this.putDirect(newSP - 1, v);
    this.putDirect(newSP,     v >>> 8);
    this.putSFR(SP, newSP);
  },


  pop() {
    const curSP = this.getSFR(SP);
    const a = this.getDirect(curSP);
    this.putSFR(SP, curSP - 1);
    return a;
  },


  doADD(op, b) {
    const c = (op & 0x10) ? this.getCY() : 0;
    const a = this.getSFR(ACC)
    const pswMathCleared = this.getSFR(PSW) & ~mathMask;

    const acValue = +(((a & 0x0F) + (b & 0x0F) + c) > 0x0F);
    const c6Value = +!!(((a & 0x7F) + (b & 0x7F) + c) & 0x80);
    const cyValue = +(a + b + c > 0xFF);
    const ovValue = cyValue ^ c6Value;

    this.putSFR(PSW, pswMathCleared |
                (ovValue << pswBits.ovShift) |
                (acValue << pswBits.acShift) |
                (cyValue << pswBits.cyShift));
    this.putSFR(ACC, a + b + c);
  },


  doSUBB(op, b) {
    const c = this.getCY();
    const toSub = b + c;
    const a = this.getSFR(ACC);
    const result = (a - toSub) & 0xFF;

    const cyValue = +(a < toSub);
    const acValue = +((a & 0x0F) < (toSub & 0x0F) ||
                      (c && ((b & 0x0F) == 0x0F)));
    const ovValue = +((a < 0x80 && b > 0x7F && result > 0x7F) ||
                      (a > 0x7F && b < 0x80 && result < 0x80));

    this.putSFR(PSW, (this.getSFR(PSW) & ~mathMask) |
                ovValue << pswBits.ovShift |
                acValue << pswBits.acShift |
                cyValue << pswBits.cyShift);

    this.putSFR(ACC, a - toSub);
  },


  toSigned(v) {
    return v & 0x80 ? v - 0x100 : v;
  },


  getR(r) {
    const ra = (this.getSFR(PSW) & rsMask) + r;
    return this.iram[ra];
  },


  putR(r, v) {
    const ra = (this.getSFR(PSW) & rsMask) + r;
    this.iram[ra] = v;
  },


  // Direct accesses in 0x00..0x7F are internal RAM.
  // Above that, direct accesses are to SFRs.
  getDirect(ra) {
    if (ra < 0x80)
      return this.iram[ra];
    else
      return this.getSFR(ra);
  },


  // Direct accesses in 0x00..0x7F are internal RAM.
  // Above that, direct accesses are to SFRs.
  putDirect(ra, v) {

    if (ra < 0x80) {
      this.iram[ra] = v;
    } else {
      this.putSFR(ra, v);
    }

    if (this.debugDirect) console.log(`${displayableAddress(ra, 'd')} is now ${toHex2(v)}`);
  },


  getIndirect(r) {
    return this.iram[this.getR(r)];
  },


  putIndirect(r, v) {
    this.iram[this.getR(r)] = v;
  },


  getBitAddrMask(bn) {
    const bm = 1 << (bn & 0x07);
    const ra = bn < 0x10 ? 0x20 + (bn >>> 3) : bn & 0xF8;
    return {ra, bm};
  },
  

  getBit(bn) {
    const {ra, bm} = this.getBitAddrMask(bn);
    const v = +!!(this.getDirect(ra) & bm);

    // If we are spinning waiting for SCON.RI to go high we can
    // introduce a bit of delay.
    if (bn === SCON && !v) cpu.mayDelay = true;

    return v;
  },


  putBit(bn, b) {
    const {ra, bm} = this.getBitAddrMask(bn);
    let v = this.getDirect(ra);

    if (b) {
      v = v | bm;
    } else {
      v = v & ~bm;
    }

    this.putDirect(ra, v);
  },


  getCode(ca) {
    return this.code[ca];
  },


  getXData(xa) {
    return this.xram[xa];
  },


  putXData(xa, v) {
    this.xram[xa] = v;
  },


  bitName(bn) {
    bn = +bn;

    if (bn < 0x80) {
      return toHex2(bn);
    } else {
      return `${displayableAddress(bn & 0xF8, 'b')}.${bn & 0x07}`;
    }
  },


  dumpFetchHistory() {
    console.log(`Fetch history (oldest first):`);

    for (let k = this.fetchHistoryMask; k; --k) {
      const x = (this.fetchHistoryX - k) & this.fetchHistoryMask;
      console.log(`-${toHex2(k+1)}: ${displayableAddress(this.fetchHistory[x], 'c')}`);
    }
  },
  

  dumpBranchHistory() {
    console.log(`Branch history (oldest first):`);

    // To enable padding for readability, find maximum width of all of
    // the `from` and `to` values we will display.
    const entries = this.branchHistory.filter(bh => bh);
    const fWidth = entries
          .reduce((prevMax, cur) =>
                  Math.max(prevMax, displayableAddress(cur.from, 'c').length), 0);
    const tWidth = entries
          .reduce((prevMax, cur) =>
                  Math.max(prevMax, displayableAddress(cur.to, 'c').length), 0);

    for (let k = this.branchHistoryMask; k >= 0; --k) {
      const x = (this.branchHistoryX - k) & this.branchHistoryMask;
      const bh = this.branchHistory[x];
      if (!bh) continue;
      console.log(`\
${displayableAddress(bh.from, 'c').padStart(fWidth)}: \
${bh.opName.padEnd(5)} \
${displayableAddress(bh.to, 'c').padEnd(tWidth)} \
${briefState(bh.state)}`);
    }

    console.log('');
  },
  

  disassemble(pc) {
    const op = this.code[pc];
    const ope = opTable[op];

    if (!ope) {
      console.log(`Undefined opTable[${op}] pc=${pc}`);
      this.dumpFetchHistory();
    }

    const nextPC = pc + ope.n;
    const bytes = this.code.slice(pc, nextPC);

    const disassembly = bytes.toString('hex')
          .toUpperCase()
          .match(/.{2}/g)
          .join(' ')
          .padEnd(10);
    
    const handlers = {
      bit: x => displayableBit(bytes[+x]),
      nbit: x => '/' + displayableBit(bytes[+x]),
      immed: x => '#' + toHex2(bytes[+x]),
      immed16: x => '#' + toHex4(bytes[+x] << 8 | bytes[+x+1]),
      addr16: x => displayableAddress(bytes[+x] << 8 | bytes[+x+1], 'c'),
      addr11: x => displayableAddress((nextPC & 0xF800) | ((op & 0xE0) << 3) | bytes[+x], 'c'),
      verbatum: x => x,
      direct: x => displayableAddress(bytes[+x], 'd'),
      rela: x => displayableAddress(nextPC + this.toSigned(bytes[+x]), 'c'),
    };

    const operands = ope.operands.split(/,/)
            .map(opnd => {
              let [offset, handler] = opnd.split(/:/);
              if (handler == null) handler = 'verbatum';
              return {offset, handler};
            })
            .map(x => handlers[x.handler](x.offset))
            .join(',');

    return `\
${displayableAddress(pc, 'c').padStart(28)}: \
${disassembly}  ${ope.name.padEnd(6)} ${operands}`;
  },


  dumpState() {
    console.log(`\
 a=${toHex2(this.SFR[ACC])}   b=${toHex2(this.SFR[B])}  cy=${+this.getCY()} ov=${+this.getOV()} ac=${this.getAC()}  \
sp=${toHex2(this.SFR[SP])} psw=${toHex2(this.SFR[PSW])}  dptr=${toHex4(this.getDPTR())}  \
pc=${toHex4(this.pc)}
${_.range(0, 8)
  .map((v, rn) => `r${rn}=${toHex2(this.getR(rn))}`)
  .join('  ')
}`);
  },

  dumpCount: 50,


  captureState() {
    const rBase = this.SFR[PSW] & rsMask;
    const state = {
      a: this.SFR[ACC],
      b: this.SFR[B],
      cy: this.getCY(),
      ov: this.getOV(),
      ac: this.getAC(),
      sp: this.SFR[SP],
      psw: this.SFR[PSW],
      dptr: this.getDPTR(),
      regs: [...this.iram.slice(rBase, rBase+8)],
    };

    return state;
  },


  // Called whenever we change the PC via instruction or command. `opName`
  // is the opcode/command that caused the change.
  saveBranchHistory(from, to, opName) {
    this.branchHistoryX = (this.branchHistoryX + 1) & this.branchHistoryMask;
    this.branchHistory[this.branchHistoryX] = {from, to, opName, state: this.captureState()};
  },
  

  run1(insnPC) {
    this.pc = insnPC;

    this.fetchHistoryX = (this.fetchHistoryX + 1) & this.fetchHistoryMask;
    this.fetchHistory[this.fetchHistoryX] = this.pc;

    const op = this.fetch();
    ++this.instructionsExecuted;

    let rela, ea, imm, bit, a, b, c, r;

    if (debugBASIC2 && this.pc === 0x1F04) {
      if (this.dumpCount-- === 0) this.running = false;
      console.log(`RSUB1-2=1F04H: in=${toHex2(this.getR(2))}${toHex2(this.getR(0))}`);
      console.log(`    called from ${toHex2(this.iram[this.SFR[SP]])}${toHex2(this.iram[this.SFR[SP]-1])}`);
    }

    if (debugBASIC2 && this.pc === 0x1F2C) {
      console.log(`1F2C:        R2,R0=${toHex2(this.getR(2))}${toHex2(this.getR(0))}`);
    }

    if (debugBASIC2 && this.pc === 0x1F3C) {
      console.log(`1F3C:                   RETURN`);
    }

    switch (op) {

      ////////// NOP
    case 0x00:                // NOP
      break;


      ////////// ACALL
    case 0x11:                // ACALL page0
    case 0x31:                // ACALL page2
    case 0x51:                // ACALL page2
    case 0x71:                // ACALL page3
    case 0x91:                // ACALL page4
    case 0xB1:                // ACALL page5
    case 0xD1:                // ACALL page6
    case 0xF1:                // ACALL page7
      b = this.fetch();
      this.push2(this.pc);
      this.pc = (this.pc & 0xF800) | ((op & 0xE0) << 3) | b;
      this.saveBranchHistory(insnPC, this.pc, 'ACALL');
      break;


      ////////// ADD/ADDC
    case 0x24:                // ADD A,#imm
    case 0x34:                // ADDC A,#imm
      imm = this.fetch();
      this.doADD(op, imm);
      break;

    case 0x25:                // ADD A,dir
    case 0x35:                // ADDC A,dir
      ea = this.fetch();
      this.doADD(op, this.getDirect(ea));
      break;

    case 0x26:                // ADD A,@R0
    case 0x27:                // ADD A,@R1
    case 0x36:                // ADDC A,@R0
    case 0x37:                // ADDC A,@R1
      r = op & 1;
      this.doADD(op, this.getIndirect(r));
      break;

    case 0x28:                // ADD R0
    case 0x29:                // ADD R1
    case 0x2A:                // ADD R2
    case 0x2B:                // ADD R3
    case 0x2C:                // ADD R4
    case 0x2D:                // ADD R5
    case 0x2E:                // ADD R6
    case 0x2F:                // ADD R7
    case 0x38:                // ADDC R0
    case 0x39:                // ADDC R1
    case 0x3A:                // ADDC R2
    case 0x3B:                // ADDC R3
    case 0x3C:                // ADDC R4
    case 0x3D:                // ADDC R5
    case 0x3E:                // ADDC R6
    case 0x3F:                // ADDC R7
      r = op & 0x07;
      this.doADD(op, this.getR(r));
      break;


      ////////// AJMP
    case 0x01:                // AJMP page0
    case 0x21:                // AJMP page1
    case 0x41:                // AJMP page2
    case 0x61:                // AJMP page3
    case 0x81:                // AJMP page4
    case 0xA1:                // AJMP page5
    case 0xC1:                // AJMP page6
    case 0xE1:                // AJMP page7
      b = this.fetch();
      this.pc = (this.pc & 0xF800) | ((op & 0xE0) << 3) | b;
      this.saveBranchHistory(insnPC, this.pc, 'AJMP');
      break;


      ////////// ANL
    case 0x52:                // ANL dir,A
      ea = this.fetch();
      a = this.getDirect(ea) & this.getSFR(ACC);
      this.putDirect(ea, a);
      break;

    case 0x53:                // ANL dir,#imm
      ea = this.fetch();
      imm = this.fetch();
      a = this.getDirect(ea) & imm;
      this.putDirect(ea, a);
      break;

    case 0x54:                // ANL A,#imm
      imm = this.fetch();
      a = this.getSFR(ACC) & imm;
      this.putSFR(ACC, a);
      break;

    case 0x55:                // ANL A,dir
      ea = this.fetch();
      a = this.getSFR(ACC) & this.getDirect(ea);
      this.putSFR(ACC, a);
      break;

    case 0x56:                // ANL A,@R0
    case 0x57:                // ANL A,@R1
      r = op & 1;
      a = this.getSFR(ACC) & this.getIndirect(r);
      this.putSFR(ACC, a);
      break;

    case 0x58:                // ANL A,R0
    case 0x59:                // ANL A,R1
    case 0x5A:                // ANL A,R2
    case 0x5B:                // ANL A,R3
    case 0x5C:                // ANL A,R4
    case 0x5D:                // ANL A,R5
    case 0x5E:                // ANL A,R6
    case 0x5F:                // ANL A,R7
      r = op & 0x07;
      a = this.getSFR(ACC) & this.getR(r);
      this.putSFR(ACC, a);
      break;

    case 0x82:                // ANL C,bit
      bit = this.fetch();
      this.putCY(this.getBit(bit));
      break;

    case 0xB0:                // ANL C,/bit
      bit = this.fetch();
      c = this.getBit(bit);
      this.putCY(this.getCY() & +!c);
      break;


      ////////// CJNE
    case 0xB4:                // CJNE A,#imm,rela
      a = this.getSFR(ACC);
      imm = this.fetch();
      b = imm;
      rela = this.toSigned(this.fetch());

      if (a !== b) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'CJNE');
      }

      this.putCY(+(a < b));
      break;

    case 0xB5:                // CJNE A,dir,rela
      a = this.getSFR(ACC);
      ea = this.fetch();
      b = this.getDirect(ea);
      rela = this.toSigned(this.fetch());

      if (a !== b) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'CJNE');
      }

      this.putCY(+(a < b));
      break;

    case 0xB6:                // CJNE @R0,#imm,rela
    case 0xB7:                // CJNE @R1,#imm,rela
      r = op & 1;
      a = this.getIndirect(r);
      imm = this.fetch();
      b = imm;
      rela = this.toSigned(this.fetch());

      if (a !== b) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'CJNE');
      }

      this.putCY(+(a < b));
      break;

    case 0xB8:                // CJNE R0,#imm,rela
    case 0xB9:                // CJNE R1,#imm,rela
    case 0xBA:                // CJNE R2,#imm,rela
    case 0xBB:                // CJNE R3,#imm,rela
    case 0xBC:                // CJNE R4,#imm,rela
    case 0xBD:                // CJNE R5,#imm,rela
    case 0xBE:                // CJNE R6,#imm,rela
    case 0xBF:                // CJNE R7,#imm,rela
      r = op & 0x07;
      a = this.getR(r);
      imm = this.fetch();
      b = imm;
      rela = this.toSigned(this.fetch());

      if (a !== b) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'CJNE');
      }

      this.putCY(+(a < b));
      break;

      ////////// CLR
    case 0xC2:                // CLR bit
      bit = this.fetch();
      this.putBit(bit, 0);
      break;
      
    case 0xC3:                // CLR C
      this.putCY(0);
      break;
      
    case 0xE4:                // CLR A
      this.putSFR(ACC, 0);
      break;
      

      ////////// CPL
    case 0xB2:                // CPL bit
      bit = this.fetch();
      b = +!this.getBit(bit);
      this.putBit(bit, b);
      break;
      
    case 0xB3:                // CPL C
      c = +!this.getCY();
      this.putCY(c);
      break;
      
    case 0xF4:                // CPL A
      a = this.getSFR(ACC) ^ 0xFF;
      this.putSFR(ACC, a);
      break;
      

      ////////// DA
    case 0xD4:                // DA A
      a = this.getSFR(ACC);
      c = this.getCY();

      // Lower nybble
      if ((a & 0x0F) > 0x09 || this.getAC()) {
        a += 0x06;
        c |= +(a > 0xFF);
        a &= 0xFF;              // Necessary?
      }

      // Upper nybble
      if ((a & 0xF0) > 0x90 || c) {
        a += 0x60;
        c |= +(a > 0xF0);
        a &= 0xFF;              // Not necessary
      }

      this.putSFR(ACC, a);
      this.putCY(c);
      break;
      

      ////////// DEC
    case 0x14:                // DEC A
      a = this.getSFR(ACC) - 1;
      this.putSFR(ACC, a);
      break;

    case 0x15:                // DEC dir
      ea = this.fetch();
      a = this.getDirect(ea) - 1;
      this.putDirect(ea, a);
      break;

    case 0x16:                // DEC @R0
    case 0x17:                // DEC @R1
      r = op & 1;
      a = this.getIndirect(r) - 1;
      this.putIndirect(r, a);
      break;

    case 0x18:                // DEC R0
    case 0x19:                // DEC R1
    case 0x1A:                // DEC R2
    case 0x1B:                // DEC R3
    case 0x1C:                // DEC R4
    case 0x1D:                // DEC R5
    case 0x1E:                // DEC R6
    case 0x1F:                // DEC R7
      r = op & 0x07;
      a = this.getR(r) - 1;
      this.putR(r, a);
      break;


      ////////// DIV
    case 0x84:                // DIV AB
      // DIV always clears CY and AC and sets OV on divide by 0
      b = this.getSFR(B);

      if (b === 0) {
        this.putOV(1);
      } else {
        const curACC = this.getSFR(ACC);
        a = Math.floor(curACC / b);
        b = curACC % b;
        this.putSFR(ACC, a);
        this.putSFR(B, b);
      }

      break;


      ////////// DJNZ
    case 0xD5:                // DJNZ dir,rela
      ea = this.fetch();
      a = this.getDirect(ea) - 1;
      rela = this.toSigned(this.fetch());

      if (a !== 0) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'DJNZ');
      }
      
      this.putDirect(ea, a);
      break;

    case 0xD8:                // DJNZ R0,rela
    case 0xD9:                // DJNZ R1,rela
    case 0xDA:                // DJNZ R2,rela
    case 0xDB:                // DJNZ R3,rela
    case 0xDC:                // DJNZ R4,rela
    case 0xDD:                // DJNZ R5,rela
    case 0xDE:                // DJNZ R6,rela
    case 0xDF:                // DJNZ R7,rela
      r = op & 0x07;
      a = this.getR(r) - 1;
      rela = this.toSigned(this.fetch());

      if (a !== 0) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'DJNZ');
      }

      this.putR(r, a);
      break;


      ////////// INC
    case 0x04:                // INC A
      a = this.getSFR(ACC) + 1;
      this.putSFR(ACC, a);
      break;

    case 0x05:                // INC dir
      ea = this.fetch();
      a = this.getDirect(ea) + 1;
      this.putDirect(ea, a);
      break;

    case 0x06:                // INC @R0
    case 0x07:                // INC @R1
      r = op & 1;
      a = this.getIndirect(r) + 1;
      this.putIndirect(r, a);
      break;

    case 0x08:                // INC R0
    case 0x09:                // INC R1
    case 0x0A:                // INC R2
    case 0x0B:                // INC R3
    case 0x0C:                // INC R4
    case 0x0D:                // INC R5
    case 0x0E:                // INC R6
    case 0x0F:                // INC R7
      r = op & 0x07;
      a = this.getR(r) + 1;
      this.putR(r, a);
      break;

    case 0xA3:                // INC DPTR
      a = this.getDPTR() + 1;
      this.putDPTR(a);
      break;


      ////////// JB
    case 0x20:                // JB bit,rela
      bit = this.fetch();
      rela = this.toSigned(this.fetch());

      if (this.getBit(bit)) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'JB');
      }

      break;


      ////////// JBC
    case 0x10:                // JBC bit,rela
      bit = this.fetch();
      rela = this.toSigned(this.fetch());

      if (this.getBit(bit)) {
        this.putBit(bit, 0);
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'JBC');
      }

      break;


      ////////// JC
    case 0x40:                // JC rela
      rela = this.toSigned(this.fetch());

      if (this.getCY()) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'JC');
      }

      break;


      ////////// JMP
    case 0x73:                // JMP @A+DPTR
      a = this.getSFR(ACC) + this.getDPTR();
      this.pc = a & 0xFFFF;
      this.saveBranchHistory(insnPC, this.pc, 'JMP');
      break;


      ////////// JNB
    case 0x30:                // JNB bit,rela
      bit = this.fetch();
      rela = this.toSigned(this.fetch());

      if (!this.getBit(bit)) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'JNB');
      }

      break;


      ////////// JNC
    case 0x50:                // JNC rela
      rela = this.toSigned(this.fetch());

      if (!this.getCY()) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'JNC');
      }

      break;


      ////////// JNZ
    case 0x70:                // JNZ rela
      rela = this.toSigned(this.fetch());
      a = this.getSFR(ACC);

      if (a !== 0) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'JNZ');
      }

      break;


      ////////// JZ
    case 0x60:                // JZ rela
      rela = this.toSigned(this.fetch());
      a = this.getSFR(ACC);

      if (a === 0) {
        this.pc += rela;
        this.saveBranchHistory(insnPC, this.pc, 'JZ');
      }

      break;


      ////////// LCALL
    case 0x12:                // LCALL addr16
      a = this.fetch();
      b = this.fetch();
      this.push2(this.pc);
      this.pc = (a << 8) | b;
      this.saveBranchHistory(insnPC, this.pc, 'LCALL');
      break;


      ////////// LJMP
    case 0x02:                // LJMP addr16
      a = this.fetch();
      b = this.fetch();
      this.pc = (a << 8) | b;
      this.saveBranchHistory(insnPC, this.pc, 'LJMP');
      break;


      ////////// MOV
    case 0x76:                // MOV @R0,#imm
    case 0x77:                // MOV @R1,#imm
      r = op & 1;
      imm = this.fetch();
      this.putIndirect(r, imm);
      break;

    case 0xF6:                // MOV @R0,A
    case 0xF7:                // MOV @R1,A
      r = op & 1;
      a = this.getSFR(ACC);
      this.putIndirect(r, a);
      break;

    case 0xA6:                // MOV @R0,dir
    case 0xA7:                // MOV @R1,dir
      r = op & 1;
      ea = this.fetch();
      a = this.getDirect(ea);
      this.putIndirect(r, a);
      break;

    case 0x74:                // MOV A,#imm
      imm = this.fetch();
      this.putSFR(ACC, imm);
      break;

    case 0xE6:                // MOV A,@R0
    case 0xE7:                // MOV A,@R1
      r = op & 1;
      a = this.getIndirect(r);
      this.putSFR(ACC, a);
      break;

    case 0xE8:                // MOV A,R0
    case 0xE9:                // MOV A,R1
    case 0xEA:                // MOV A,R2
    case 0xEB:                // MOV A,R3
    case 0xEC:                // MOV A,R4
    case 0xED:                // MOV A,R5
    case 0xEE:                // MOV A,R6
    case 0xEF:                // MOV A,R7
      r = op & 0x07;
      a = this.getR(r);
      this.putSFR(ACC, a);
      break;

    case 0xE5:                // MOV A,dir
      ea = this.fetch();
      a = this.getDirect(ea);
      this.putSFR(ACC, a);
      break;

    case 0xA2:                // MOV C,bit
      bit = this.fetch();
      b = this.getBit(bit);
      this.putCY(b);
      break;

    case 0x90:                // MOV DPTR,#immed16
      a = this.fetch();
      b = this.fetch();
      this.putDPTR(a << 8 | b);
      break;

    case 0x78:                // MOV R0,#imm
    case 0x79:                // MOV R1,#imm
    case 0x7A:                // MOV R2,#imm
    case 0x7B:                // MOV R3,#imm
    case 0x7C:                // MOV R4,#imm
    case 0x7D:                // MOV R5,#imm
    case 0x7E:                // MOV R6,#imm
    case 0x7F:                // MOV R7,#imm
      r = op & 0x07;
      a = this.fetch();
      this.putR(r, a);
      break;

    case 0xF8:                // MOV R0,A
    case 0xF9:                // MOV R1,A
    case 0xFA:                // MOV R2,A
    case 0xFB:                // MOV R3,A
    case 0xFC:                // MOV R4,A
    case 0xFD:                // MOV R5,A
    case 0xFE:                // MOV R6,A
    case 0xFF:                // MOV R7,A
      r = op & 0x07;
      a = this.getSFR(ACC);
      this.putR(r, a);
      break;

    case 0xA8:                // MOV R0,dir
    case 0xA9:                // MOV R1,dir
    case 0xAA:                // MOV R2,dir
    case 0xAB:                // MOV R3,dir
    case 0xAC:                // MOV R4,dir
    case 0xAD:                // MOV R5,dir
    case 0xAE:                // MOV R6,dir
    case 0xAF:                // MOV R7,dir
      r = op & 0x07;
      ea = this.fetch();
      a = this.getDirect(ea);
      this.putR(r, a);
      break;

    case 0x92:                // MOV bit,C
      bit = this.fetch();
      b = this.getCY();
      this.putBit(bit, b);
      break;

    case 0x75:                // MOV dir,#imm
      ea = this.fetch();
      imm = this.fetch();
      this.putDirect(ea, imm);
      break;

    case 0x86:                // MOV dir,@R0
    case 0x87:                // MOV dir,@R1
      r = op & 1;
      ea = this.fetch();
      a = this.getIndirect(r);
      this.putDirect(ea, a);
      break;

    case 0x88:                // MOV dir,R0
    case 0x89:                // MOV dir,R1
    case 0x8A:                // MOV dir,R2
    case 0x8B:                // MOV dir,R3
    case 0x8C:                // MOV dir,R4
    case 0x8D:                // MOV dir,R5
    case 0x8E:                // MOV dir,R6
    case 0x8F:                // MOV dir,R7
      r = op & 0x07;
      ea = this.fetch();
      a = this.getR(r);
      this.putDirect(ea, a);
      break;

    case 0xF5:                // MOV dir,A
      ea = this.fetch();
      a = this.getSFR(ACC);
      this.putDirect(ea, a);
      break;

    case 0x85:                // MOV dir,dir
      b = this.fetch();
      a = this.getDirect(b);
      ea = this.fetch();
      this.putDirect(ea, a);
      break;


      ////////// MOVC
    case 0x93:                // MOVC A,@A+DPTR
      a = (this.getSFR(ACC) + this.getDPTR()) & 0xFFFF;
      this.putSFR(ACC, this.getCode(a));
      break;

    case 0x83:                // MOVC A,@A+PC
      a = (this.getSFR(ACC) + this.pc) & 0xFFFF;
      this.putSFR(ACC, this.getCode(a));
      break;


      ////////// MOVX
    case 0xF0:                // MOVX @DPTR,A
      ea = this.getDPTR();
      this.putSFR(P1, ea);
      this.putSFR(P2, ea >>> 8);
      a = this.getSFR(ACC);
      this.putXData(ea, a);
      break;

    case 0xF2:                // MOVX @R0,A
    case 0xF3:                // MOVX @R1,A
      r = op & 1;
      ea = this.getR(r);
      this.putSFR(P1, ea);
      ea |= this.getSFR(P2) << 8;
      a = this.getSFR(ACC);
      this.putXData(ea, a);
      break;

    case 0xE0:                // MOVX A,@DPTR
      ea = this.getDPTR();
      this.putSFR(P1, ea);
      this.putSFR(P2, ea >>> 8);
      a = this.getXData(ea);
      this.putSFR(ACC, a);
      break;

    case 0xE2:                // MOVX A,@R0
    case 0xE3:                // MOVX A,@R1
      r = op & 1;
      ea = this.getR(r);
      this.putSFR(P1, ea);
      ea |= this.getSFR(P2) << 8;
      a = this.getXData(ea);
      this.putSFR(ACC, a);
      break;


      ////////// MUL
    case 0xA4:                // MUL AB
      this.putCY(0);          // Always clears CY.
      a = this.getSFR(ACC) * this.getSFR(B);
      this.putOV(+(a > 0xFF));
      this.putSFR(ACC, a);
      this.putSFR(B, a >>> 8);
      break;


      ////////// ORL
    case 0x42:                // ORL dir,A
      ea = this.fetch();
      a = this.getDirect(ea);
      a |= this.getSFR(ACC);
      this.putDirect(ea, a);
      break;

    case 0x43:                // ORL dir,#imm
      ea = this.fetch();
      imm = this.fetch();
      a = this.getDirect(ea);
      a |= imm;
      this.putDirect(ea, a);
      break;

    case 0x44:                // ORL A,#imm
      imm = this.fetch();
      a = this.getSFR(ACC) | imm;
      this.putSFR(ACC, a);
      break;

    case 0x45:                // ORL A,dir
      ea = this.fetch();
      a = this.getSFR(ACC) | this.getDirect(ea);
      this.putSFR(ACC, a);
      break;

    case 0x46:                // ORL A,@R0
    case 0x47:                // ORL A,@R1
      r = op & 1;
      a = this.getSFR(ACC) | this.getIndirect(r);
      this.putSFR(ACC, a);
      break;

    case 0x48:                // ORL A,R0
    case 0x49:                // ORL A,R1
    case 0x4A:                // ORL A,R2
    case 0x4B:                // ORL A,R3
    case 0x4C:                // ORL A,R4
    case 0x4D:                // ORL A,R5
    case 0x4E:                // ORL A,R6
    case 0x4F:                // ORL A,R7
      r = op & 0x07;
      a = this.getSFR(ACC) | this.getR(r);
      this.putSFR(ACC, a);
      break;

    case 0x72:                // ORL C,bit
      bit = this.fetch();
      c = this.getCY();
      c |= this.getBit(bit);
      this.putCY(c);
      break;

    case 0xA0:                // ORL C,/bit
      bit = this.fetch();
      c = +!this.getBit(bit);
      this.putCY(this.getCY() | c);
      break;


      ////////// POP
    case 0xD0:                // POP dir
      ea = this.fetch();
      a = this.pop();
      this.putDirect(ea, a);
      break;


      ////////// PUSH
    case 0xC0:                // PUSH dir
      ea = this.fetch();
      a = this.getDirect(ea);
      this.push1(a);
      break;


      ////////// RET
    case 0x22:                // RET
      a = this.pop();
      b = this.pop();
      this.pc = (a << 8) | b;
      this.saveBranchHistory(insnPC, this.pc, 'RET');
      break;


      ////////// IRET
    case 0x32:                // IRET
      a = this.pop();
      b = this.pop();
      this.pc = (a << 8) | b;
      this.ipl = this.ipl - 1;
      if (this.ipl < -1) this.ipl = -1;
      this.saveBranchHistory(insnPC, this.pc, 'IRET');
      break;


      ////////// RL
    case 0x23:                // RL A
      a = this.getSFR(ACC);
      a <<= 1;
      a = a & 0xFF | a >>> 8;
      this.putSFR(ACC, a); 
      break;


      ////////// RLC
    case 0x33:                // RLC A
      a = this.getSFR(ACC);
      c = this.getCY();
      this.putCY(a >>> 7);
      a <<= 1;
      this.putSFR(ACC, a | c);
      break;


      ////////// RR
    case 0x03:                // RR A
      a = this.getSFR(ACC);
      a = a >>> 1 | a << 7;
      this.putSFR(ACC, a);
      break;


      ////////// RRC
    case 0x13:                // RRC A
      a = this.getSFR(ACC);
      c = this.getCY();
      this.putCY(a & 1);
      a >>>= 1;
      a |= c << 7;
      this.putSFR(ACC, a);
      break;


      ////////// SETB
    case 0xD2:                // SETB bit
      bit = this.fetch();
      this.putBit(bit, 1);
      break;
      
    case 0xD3:                // SETB C
      this.putCY(1);
      break;
      

      ////////// SJMP
    case 0x80:                // SJMP rela
      rela = this.toSigned(this.fetch());
      this.pc += rela;
      this.saveBranchHistory(insnPC, this.pc, 'SJMP');
      break;


      ////////// SUB/SUBB
    case 0x94:                // SUBB A,#imm
      imm = this.fetch();
      this.doSUBB(op, imm);
      break;

    case 0x95:                // SUBB A,dir
      ea = this.fetch();
      this.doSUBB(op, this.getDirect(ea));
      break;

    case 0x96:                // SUBB A,@R0
    case 0x97:                // SUBB A,@R1
      r = op & 1;
      a = this.getIndirect(r);
      this.doSUBB(op, a);
      break;

    case 0x98:                // SUBB R0
    case 0x99:                // SUBB R1
    case 0x9A:                // SUBB R2
    case 0x9B:                // SUBB R3
    case 0x9C:                // SUBB R4
    case 0x9D:                // SUBB R5
    case 0x9E:                // SUBB R6
    case 0x9F:                // SUBB R7
      r = op & 0x07;
      this.doSUBB(op, this.getR(r));
      break;


      ////////// SWAP
    case 0xC4:                // SWAP A
      a = this.getSFR(ACC);
      b = a >>> 4;
      a &= 0x0f;
      a <<= 4;
      this.putSFR(ACC, a | b);
      break;


      ////////// UNDEFINED
    case 0xA5:                // UNDEFINED
      this.putCY(1);
      break;


      ////////// XCH
    case 0xC5:                // XCH A,dir
      ea = this.fetch();
      b = this.getDirect(ea);
      this.putDirect(ea, this.getSFR(ACC));
      this.putSFR(ACC, b);
      break;

    case 0xC6:                // XCH A,@R0
    case 0xC7:                // XCH A,@R1
      r = op & 1;
      b = this.getIndirect(r);
      this.putDirect(r, this.getSFR(ACC));
      this.putSFR(ACC,  b);
      break;

    case 0xC8:                // XCH A,R0
    case 0xC9:                // XCH A,R1
    case 0xCA:                // XCH A,R2
    case 0xCB:                // XCH A,R3
    case 0xCC:                // XCH A,R4
    case 0xCD:                // XCH A,R5
    case 0xCE:                // XCH A,R6
    case 0xCF:                // XCH A,R7
      r = op & 0x07;
      b = this.getR(r);
      this.putR(r, this.getSFR(ACC));
      this.putSFR(ACC, b);
      break;

      
      ////////// XCHD
    case 0xD6:                // XCHD A,@R0
    case 0xD7:                // XCHD A,@R1
      r = op & 1;
      a = this.getSFR(ACC);
      b = this.getIndirect(r);
      this.putSFR(ACC,    (a & 0xF0) | (b & 0x0F));
      this.putIndirect(r, (b & 0xF0) | (a & 0x0F));
      break;


      ////////// XRL
    case 0x62:                // XRL dir,A
      ea = this.fetch();
      a = this.getDirect(ea) ^ this.getSFR(ACC);
      this.putDirect(ea, a);
      break;

    case 0x63:                // XRL dir,#imm
      ea = this.fetch();
      imm = this.fetch();
      a = this.getDirect(ea);
      a ^= imm;
      this.putDirect(ea, a);
      break;

    case 0x64:                // XRL A,#imm
      imm = this.fetch();
      a = this.getSFR(ACC) ^ imm;
      this.putSFR(ACC, a);
      break;

    case 0x65:                // XRL A,dir
      ea = this.fetch();
      a = this.getSFR(ACC) ^ this.getDirect(ea);
      this.putSFR(ACC, a);
      break;

    case 0x66:                // XRL A,@R0
    case 0x67:                // XRL A,@R1
      r = op & 1;
      a = this.getSFR(ACC) ^ this.getIndirect(r);
      this.putSFR(ACC, a);
      break;

    case 0x68:                // XRL A,R0
    case 0x69:                // XRL A,R1
    case 0x6A:                // XRL A,R2
    case 0x6B:                // XRL A,R3
    case 0x6C:                // XRL A,R4
    case 0x6D:                // XRL A,R5
    case 0x6E:                // XRL A,R6
    case 0x6F:                // XRL A,R7
      r = op & 0x07;
      a = this.getSFR(ACC) ^ this.getR(r);
      this.putSFR(ACC, a);
      break;


    default:
      console.log(`\
Unimplmented opcode=0x${toHex2(op)} at 0x${toHex4(this.pc-1)}`);
      this.running = false;
      break;
    }
  },
};


// Take a string and return a bit field object containing xShift and
// xMask values for each bit. The string is a space separated list of
// fields left to right where the leftmost is bit #n and rightmost is
// bit #0 and '.' is used for a reserved bit.
function makeBits(bitDescriptorString) {
  const o = {};

  bitDescriptorString.split(/\s+/)
    .reverse()
    .map((name, index) => {

      if (name !== '.') {
        o[name + 'Shift'] = index;
        o[name + 'Mask'] = 1 << index;
      }
    });

  return o;
}


try {
  test_makeBits;

  const s1 = 'a7 b6 c5 d4 e3 f2 g1 h0';
  console.log(`makeBits("${s1}") =`, makeBits(s1));

  const s2 = 'a7 b6 . d4 . f2 . h0';
  console.log(`makeBits("${s2}") =`, makeBits(s2));
} catch(e) {
}


try {
  gen_parity;

  let s = '';

  for (let k = 0; k <= 0xFF; ++k) {
    let p = 0;

    for (let bn = 7; bn >= 0; --bn) {
      p = p ^ ((k >>> bn) & 1);
    }

    s = s.concat(p ? '1,' : '0,',
                 ((k & 0x1F) === 0x1F) ? "\n" : "");
  }

  console.log(s);
} catch(e) {
}


var lastX = 0;
var lastLine = "";

let startOfLastStep = 0;

// Keys of this are addresses for the specified type of access
// that should cause a breakpoint stop. The value is an object:
// * msg = Message to print when stopping at this point
// * transient = Boolean to indicate breakpoint is self-clearing
let stopReasons = {
  code: {},                     // PC code fetch
  iramR: {},                    // Internal RAM read
  iramW: {},                    // Internal RAM write
  sfrR: {},                     // SFR read
  sfrW: {},                     // SFR write
  xdataR: {},                   // External data read
  xdataW: {},                   // External data write
};


// User can enter short substrings, and it's not the unambiguous match
// but rather the first (case-insensitive) match that is used. Put
// these in order of precedence in case of ambiguity of the shortened
// name.
const commands = [
  {name: 'dump',
   description: 'Dump processor state',
   doFn: doDump,
  },
  
  {name: 'step',
   description: 'Step N times, where N is 1 if not specified',
   doFn: doStep,
  },

  {name: 'go',
   description: 'Continue execution starting at specified PC or current PC if not specified.',
   doFn: doGo,
  },

  {name: 'til',
   description: 'Continue execution starting at specified PC or current PC if not specified.',
   doFn: doTil,
  },

  {name: 'break',
   description: 'Set breakpoint at specified address.',
   doFn: doBreak,
  },

  {name: 'blist',
   description: 'List breakpoints.',
   doFn: doBreakList,
  },

  {name: 'unbreak',
   description: 'Clear breakpoint at specified address.',
   doFn: doUnbreak,
  },

  {name: 'mem',
   description: 'Display external memory at specified address.',
   doFn: doMem,
  },

  {name: 'code',
   description: 'Display code memory at specified address.',
   doFn: doCode,
  },

  {name: 'history',
   description: 'Display history of PC.',
   doFn: () => cpu.dumpFetchHistory(),
  },

  {name: 'bhistory',
   description: 'Display history of branches.',
   doFn: () => cpu.dumpBranchHistory(),
  },

  {name: 'sfr',
   description: 'Display SFR at specified address.',
   doFn: doSFR,
  },

  {name: 'iram',
   description: 'Display IRAM at specified address.',
   doFn: doIRAM,
  },

  {name: 'list',
   description: 'Disassemble memory at specified address.',
   doFn: doList,
  },

  {name: 'over',
   description: 'Execute through a call, stopping when execution returns to +1, +2, or +3.',
   doFn: doOver,
  },

  {name: 'quit',
   description: 'Exit the emulator.',
   doFn: doQuit,
  },

  {name: 'debug',
   description: `\
With no args, display current registered simulator debug flags and their values.
With arguments, set specified flag to specified value. If value is unspecified, toggle.\
`,
   doFn: doDebug,
  },

  {name: 'stats',
   description: 'Display statistics we capture.',
   doFn: doStats,
  },

  {name: 'help',
   description: 'Get a list of available commands and description of each.',
   doFn: doHelp,
  },
];


function curInstruction() {
  return cpu.disassemble(cpu.pc);
}


function handleLine(line) {
  const parseLine = () => line.toLowerCase().trim().split(/\s+/);
  let words = parseLine();

  if ((words.length === 0 || words[0].length === 0) && lastLine != 0) {
    line = lastLine;
    words = parseLine();
  }

  let cmd = words[0] || '?';

  lastLine = line;

  var cmdX = commands.findIndex(c => c.name.indexOf(cmd) === 0);

  if (cmdX >= 0) {
    commands[cmdX].doFn(words);
  } else {
    doHelp();
  }

  if (rl) rl.question(`${curInstruction()} > `, handleLine);
}


const OFFSET_THRESHOLD = 0x80;

function findClosestSymbol(x, space) {
  let closestOffset = Number.POSITIVE_INFINITY;
  let closestSym = null;

  Object.values(syms[space]).forEach(sym => {
    const offset = x - sym.addr;

    if (offset >= 0 && offset < closestOffset) {
      closestSym = sym;
      closestOffset = offset;
    }
  });

  if (closestSym && closestOffset < OFFSET_THRESHOLD) {
    return [closestSym, closestOffset];
  } else {
    return [];
  }
}


// Return a compact display strong for the state captured by
// cpu.captureState().
// A=XX B=XX SP=XX PSW=XX CoA DPTR=XXXX R:XX XX XX XX  XX XX XX XX
function briefState(s) {
  return `\
A=${toHex2(s.a)} \
B=${toHex2(s.b)} \
SP=${toHex2(s.sp)} \
PSW=${toHex2(s.psw)} \
${s.cy ? 'C' : 'c'}${s.ov ? 'O' : 'o'}${s.ac ? 'A' : 'a'} \
DPTR=${toHex4(s.dptr)} \
R:${s.regs.map((v, x) => toHex2(v) + (x === 3 ? ' ' : '')).join(' ')}`;
}


function displayableBit(ba) {
  let [closestSym, closestOffset] = findClosestSymbol(ba, 'b');

  if (closestSym && closestOffset === 0) {
    return `${closestSym.name}=${toHex2(ba)}`;
  } else if (closestSym && closestOffset < 8 && (closestSym.addr & 0xF8) === 0) {
    return `${closestSym.name}.${closestOffset}=${toHex2(ba)}`;
  } else {
    return toHex2(ba) + 'H';
  }
}


function displayableAddress(x, space = 'c') {
  const [closestSym, closestOffset] = findClosestSymbol(x, space);

  if (closestSym) {
    return closestSym.name + (closestOffset ? "+" + toHex4(closestOffset) : "") +
      `=${toHex4(x)}`;
  } else {
    return toHex4(x) + 'H';
  }
}


function doMem(words) {
  let x, endAddress;
  let n = 0;

  if (words.length < 2) {
    x = ++lastX;
  } else {
    x = getAddress(words);

    if (words.length > 2) {
      endAddress = Math.min(x + parseInt(words[2], 16), 0x10000);
    } else {
      endAddress = x + 1;
    }
  }

  let longestAddr = 0;
  const addrs = [];
  const lines = [];
  let line = '';
  lastX = x;

  while (x < endAddress) {

    if ((n++ & 0x0F) === 0) {
      if (line.length > 0) lines.push(line);
      const addr = displayableAddress(x, 'x') + ':';
      if (addr.length > longestAddr) longestAddr = addr.length;
      addrs.push(addr);
      line = '';
    }

    if (((n - 1) & 0x07) === 0) line += ' ';
    line += ' ' + toHex2(cpu.xram[x++]);
  }

  if (line.length > 0) lines.push(line);

  console.log(lines
              .map((L, lineX) => _.padStart(addrs[lineX], longestAddr) + L)
              .join('\n'));
}


function doCode(words) {
  let x;

  if (words.length < 2) {
    x = ++lastX;
  } else {
    x = getAddress(words);
  }

  const addr = displayableAddress(x, 'c');
  console.log(`${addr}: ${toHex2(cpu.code[x])}`);
  lastX = x;
}


function doSFR(words) {
  let x;
  let w;

  if (words.length < 2) {
    x = ++lastX;
  } else {
    x = getAddress(words);
  }

  w = cpu.getDirect(x);

  let addr = displayableAddress(x, 'd');
  console.log(`${addr}: ${toHex2(w)}`);
  lastX = x;
}


function doIRAM(words) {
  let x, endAddress;
  let n = 0;

  if (words.length < 2) {
    x = ++lastX;
  } else {
    x = getAddress(words);

    if (words.length > 2) {
      endAddress = Math.min(x + parseInt(words[2], 16), 0x100);
    } else {
      endAddress = x + 1;
    }
  }

  let longestAddr = 0;
  const addrs = [];
  const lines = [];
  let line = '';
  lastX = x;

  while (x < endAddress) {

    if ((n++ & 0x0F) === 0) {
      if (line.length > 0) lines.push(line);
      const addr = displayableAddress(x, 'd') + ':';
      if (addr.length > longestAddr) longestAddr = addr.length;
      addrs.push(addr);
      line = '';
    }

    if (((n - 1) & 0x07) === 0) line += ' ';
    line += ' ' + toHex2(cpu.iram[x++]);
  }

  if (line.length > 0) lines.push(line);

  console.log(lines
              .map((L, lineX) => _.padStart(addrs[lineX], longestAddr) + L)
              .join('\n'));
}


function doList(words) {
  let x, n = 10;

  if (words.length < 2) {
    const op = cpu.code[lastX];
    const ope = opTable[op];
    x = lastX + ope.n;
  } else {
    x = getAddress(words);
    if (words.length > 2) n = parseInt(words[1]);
  }

  for (; n; --n, ++x) console.log(`${cpu.disassemble(x).padStart(40)}`);
  lastX = x;
}


function doDebug(words) {

  if (words.length === 1) {
    const maxWidth = cpu.debugFlags
      .reduce((prev, cur) => cur.length > prev ? cur.length : prev, 0);
    console.log("\nCurrent debug flags and their values:\n");
    cpu.debugFlags.forEach(f => {
      console.log(`  ${_.padStart(f, maxWidth)}: ${cpu[f]}`);
    });
    console.log("");
  } else {
    const flc = words[1].toLowerCase();
    let f = cpu.debugFlags.find(f => f.toLowerCase() === flc);

    if (!f) {
      console.log(`Unknown debug flag '${flc}'.`);
      return;
    } else {

      if (words.length < 3)
	cpu[f] = !cpu[f];	// Toggle if not specified
      else
        cpu[f] = !!words[2];
    }

    console.log(`${f} is now ${cpu[f]}.`);
  }
}


function doDump(words) {
  cpu.dumpState();
}


function doGo(words) {
  const b = words.length >= 2 ? getAddress(words) : cpu.pc;

  if (b !== cpu.pc) {
    cpu.saveBranchHistory(cpu.pc, b, 'go');
    cpu.pc = b;
  }

  startOfLastStep = cpu.instructionsExecuted;
  run(b);
}


function doTil(words) {

  if (words.length !== 2) {
    console.log("Must specify an address to go Til");
  } else {
    const b = getAddress(words);
    const bAsHex = toHex4(b);

    stopReasons.code[b] = {
      msg: 'now at ' + bAsHex,
      transient: true,
    };

    console.log(`[Running until ${bAsHex}]`);
    startOfLastStep = cpu.instructionsExecuted;
    run(cpu.pc);
  }
}


function doBreak(words) {

  if (words.length !== 2) {
    console.log("Must specify an address for breakpoint");
  } else {
    const b = getAddress(words);
    const bAsHex = toHex4(b);

    stopReasons.code[b] = {
      msg: 'breakpoint at ' + bAsHex,
      transient: false,
    };
  }
}


function doBreakList(words) {
  const addrs = Object.keys(stopReasons.code);

  if (addrs.length === 0) {
    console.log('No breakpoints');
  } else {

    const maxWidth = addrs
          .reduce((prevMax, a) => 
                  Math.max(prevMax, displayableAddress(a, 'c').length), 0);

    console.log('Current Breakpoints:\n' +
                addrs
                .sort((a, b) => parseInt(a, 16) - parseInt(b, 16))
                .map((b, bn) => `\
${('[' + (bn+1)).padStart(3) + ']'} \
${displayableAddress(b, 'c').padStart(maxWidth)}: \
${stopReasons.code[b].msg}\
${stopReasons.code[b].transient ? ' [transient]' : ''}`)
                .join('\n'), '\n');
  }
}


function doUnbreak(words) {

  if (words.length !== 2) {
    console.log("Must specify an address to clear breakpoint");
  } else {
    const b = getAddress(words);
    delete stopReasons.code[b];
  }
}


function doStep(words) {
  const n = (words.length > 1) ? parseInt(words[1]) : 1;
  startOfLastStep = cpu.instructionsExecuted;
  run(cpu.pc, n);
}


const stepOverRange = 0x10;

function doOver(words) {
  _.range(1, stepOverRange)
    .forEach(offs => stopReasons.code[cpu.pc + offs] = ({
      msg: `stepped over to $+${toHex2(offs)}H`,
      transient: true,
    }));

  startOfLastStep = cpu.instructionsExecuted;
  run(cpu.pc);
}


function doQuit(words) {
  if (rl) rl.close();
  console.log("[Exiting]");
  process.exit(0);
}


function doStats(words) {
  console.log(`Instructions executed: ${cpu.instructionsExecuted}`);
}


function doHelp(words) {

  if (!words || words.length === 1) {
    const maxWidth = commands.map(c => c.name)
      .reduce((prev, cur) => cur.length > prev ? cur.length : prev, 0);

    console.log("\nCommands:\n" + 
		commands
		.map(c => (_.padStart(c.name, maxWidth) + ': ' +
			   c.description.replace(/\n/g, '\n  ' +
						 _.padStart('', maxWidth))))
		.join('\n'));
  } else {
    const cx = commands.findIndex(c => c.name.indexOf(words[1]) === 0);

    if (cx < 0)
      console.log(`Unknown command ${words[1]}`);
    else
      console.log(commands[cx].description);
  }
}


function getAddress(words) {
  if (words.length < 2) return cpu.pc;

  switch (words[1]) {
  case 'pc':
    return cpu.pc;

  case '.':
    return lastX;

  default:
    return parseInt(words[1], 16);
  }
}


// Our readline interface instance used for command line interactions.
var rl;


function stopCLI() {
  if (rl) rl.close();
  rl = null;

  if (process.stdin.setRawMode) { // This is not defined if debugging
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', sbufKeypressHandler);
    process.stdin.resume();
  }
}


function startCLI() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer: line => {
      const completions = commands.map(c => c.name);
      const hits = completions.filter(c => c.indexOf(line) === 0);
      return [hits.length ? hits : completions, line];
    },
  });

  if (process.stdin.setRawMode) {
    process.stdin.removeListener('keypress', sbufKeypressHandler);
    process.stdin.setRawMode(false);
  }

  // Note ^C to allow user to regain control from long execute loops.
  rl.on('SIGINT', () => {
    console.log("\n[INTERRUPT]\n");
    cpu.running = false;
    startCLI();
  });

  rl.question(`${curInstruction()} > `, handleLine);
}


function sbufRx(c) {

  // Ignore characters if receiver is not enabled
  if ((cpu.SFR[SCON] & sconBits.renMask) === 0) return;

  cpu.sbufQueue.push(c);

  // TODO: Make this do RI interrupt
}


function sbufKeypressHandler(ch, key) {

  if (ch != null) {
    let c = ch.charCodeAt(0);

    // Stop with C-\ keypress
    if (c === 0x1c) {
      cpu.running = false;
    } else {
      sbufRx(c);
    }
  } else if (key.sequence) {

    // Tail-recursively send key inputs for each character in the sequence.
    function spoolOutKeySequence(seq) {
      let c = seq.charCodeAt(0);

      sbufRx(c);

      if (seq.length > 1) {
	seq = seq.slice(1);
	setImmediate(spoolOutKeySequence, seq);
      }
    }

    setImmediate(spoolOutKeySequence, key.sequence.slice(0));
  }
}


function run(pc, maxCount = Number.POSITIVE_INFINITY) {
  const startCount = cpu.instructionsExecuted;
  const startTime = process.hrtime();

  cpu.pc = pc;
  cpu.running = true;

  let skipBreakIfTrue = true;

  stopCLI();
  setImmediate(runAsync);

  function runAsync() {

    for (let n = insnsPerTick; cpu.running && n; --n) {

      if (!skipBreakIfTrue && stopReasons.code[cpu.pc]) {
	console.log(`[${stopReasons.code[cpu.pc].msg}]`); // Say why we stopped
        cpu.running = false;

        const match = stopReasons.code[cpu.pc].msg
              .match(/^stepped over to \$\+([0-9A-F]+)H/);

        // If we stepped over to, say, "stepped over to $+5" then we
        // have to delete breakpoints before this point as well.
        if (match) {
          const atOffset = parseInt(match[1], 16);
          _.range(-atOffset, stepOverRange-atOffset)
            .forEach(offs => delete stopReasons.code[cpu.pc+offs]);
        } else {
          if (stopReasons.code[cpu.pc].transient) delete stopReasons.code[cpu.pc];
        }
      } else {
	let beforePC = cpu.pc;
        let insnVals = cpu.run1(cpu.pc);

        // If we are spinning in a loop waiting for RI, just introduce
        // a bit of delay if we keep seeing RI=0.
        if (cpu.mayDelay) break;

        if (maxCount && cpu.instructionsExecuted - startCount >= maxCount)
	  cpu.running = false;
      }

      if (cpu.tracing || !cpu.running) cpu.dumpState();

      skipBreakIfTrue = false;
    }

    if (cpu.running) {

      if (cpu.mayDelay) {
        cpu.mayDelay = false;
        setTimeout(runAsync, 100);
      } else {
        setImmediate(runAsync);
      }
    } else {

      if (!maxCount || stopReasons.code[cpu.pc]) {
	const stopTime = process.hrtime();
	const nSec = (stopTime[0] - startTime[0]) + (stopTime[1] - startTime[1]) / 1e9;
	cpu.executionTime += nSec;
	const nInstructions = cpu.instructionsExecuted - startOfLastStep;
	const ips =  nInstructions / cpu.executionTime;
	console.log(`[Executed ${nInstructions} instructions ` +
		    `or ${ips.toFixed(1)}/s]`);
	startOfLastStep = 0;	// Report full count next time if not in a step
      }

      startCLI();
    }
  }
}


const syms = {d: {}, c: {}, b: {}, n: {}, x: {}};


function setupMain() {
  const argv = process.argv.slice(1);

  function usageExit(msg) {
    console.error(`${msg}
Usage:
node ${argv[0]} hex-file-name lst-file-name`);
    process.exit(1);
  }

  if (argv.length < 2 || argv.length > 3) usageExit('[missing parameter]');

  const hexName = argv[1];
  const lstName = argv[2] || (hexName.split(/\./).slice(0, -1).join('.') + '.LST');
  let hex, sym;

  try {
    hex = fs.readFileSync(hexName, {encoding: 'utf-8'});
  } catch(e) {
    usageExit(`Unable to open ${e.path}: ${e.code}`);
  }

  try {
    sym = fs.existsSync(lstName) && fs.readFileSync(lstName, {encoding: 'utf-8'})
      .replace(/\r\n/g, '\n') // DOS to UNIX
      .replace(/\r/g, '\n');   // MACOS to UNIX
  } catch(e) {
    if (argv[2]) usageExit(`Unable to open ${e.path}: ${e.code}`);
  }

  const IntelHex = require('./intel-hex');
  const hexParsed = IntelHex.parse(hex, CODESize);
  const hexLength = hexParsed.highestAddress - hexParsed.lowestAddress;

  console.log(`Loaded ${toHex4(hexParsed.lowestAddress)}: ${hexLength.toString(16)} bytes`);
  hexParsed.data.copy(cpu.code, hexParsed.lowestAddress);

  if (sym) {
    // We capture the match result so we can slice off the LST file
    // prefix before the symbols section.
    let m;
    
    // /[A-Z_0-9]+( \.)*\s+[BCD]?\s+[A-Z]+\s+[0-9A-F]+H\s+[A-Z]\s*/
    if ((m = sym.match(/^N A M E      T Y P E   V A L U E       A T T R I B U T E S\n\n/m))) {
      // Type #1: "ACC . . . .  D ADDR    00E0H   A       "
      // D shown here can be B,C,D or missing.

      // Get to just symbol table portion and remove page headings
      sym = sym
        .slice(m.index + m[0].length)
        .replace(/\f.*\n+N A M E      T Y P E   V A L U E       A T T R I B U T E S\n\n/mg, '');

      sym
        .split(/\n/)
        .forEach(line => {
          const name = line.slice(0, 12).trim().replace(/[\.\s]+/, '');
          const addrSpace = line.slice(13, 14).trim().toLowerCase() || 'n';
          const type = line.slice(15, 22).trim();
          let addr = line.slice(23, 30).trim();
          let bit = undefined;

          switch (type) {
          case 'NUMB':
            addr = parseInt(addr, 16);
            break;

          case 'ADDR':

            if (addrSpace === 'B') {
              [addr, bit] = addr.split(/\./);
              bit = +bit;
            }

            addr = parseInt(addr.replace('H', ''), 16);
            break;

          case 'REG':
          default:
            return;
          }
          
          syms[addrSpace][name] = {name, addrSpace, type, addr, bit};
        });
    } else if ((m = sym.match(/SYMBOL\s+TYPE\s+VALUE\s+LINE\n-+\n/))) {
      // SYMBOL				  TYPE     VALUE	LINE
      // ------------------------------------------------------------
      // Type #2: "AABS         CODE      139C    4795"
      //
      // The last field is source line number in decimal and not
      // present for assembler-defined symbols like ACC.

      // Get to just symbol table portion and remove page headings
      sym = sym
        .slice(m.index + m[0].length)
        .replace(/\f\n.*\n+SYMBOL\s+TYPE\s+VALUE\s+LINE\n-+\n/g, '');

      sym
        .split(/\n/)
        .forEach(line => {
          const match = line.match(/(\w+)\s+(\w+)\s+([0-9A-F]+)(?:\s+(\d+)\s*)?/);

          if (!match) return;

          let [all, name, type, addr, lNum] = match;
          let addrSpace, bit;

          switch (type) {
          case 'CODE':
            addrSpace = 'c';
            break;

          case 'NUMBER':
          case 'DATA':
            addrSpace = 'd';
            break;

          case 'XDATA':
            addrSpace = 'x';
            break;

          case 'BIT':
            addrSpace = 'b';
            addr = parseInt(addr, 16);
            bit = addr & 7;
            break;

          default:
            addr = null;
            console.log(`Unrecognized .sym file content: "${line}"`);
            break;
          }
          
          if (addr !== null) {
            if (addrSpace !== 'b') addr = parseInt(addr, 16);
            syms[addrSpace][name] = {name, addrSpace, type, addr, bit};
          }
        });
    } else {
      console.log(`Unrecognized .sym file type: "${sym.slice(0, 100)}..."`);
    }
  }
}


// Only start the thing if we are not loaded via require.
if (require.main === module) {
  setupMain();
  console.log('[Control-\\ will interrupt execution and return to prompt]');

  if (process.stdin.setRawMode)
    startCLI();
  else
    doGo(['go']);
} else {
  module.exports.opTable = opTable;
  module.exports.SFRs = SFRs;
  module.exports.toHex2 = toHex2;
  module.exports.toHex4 = toHex4;
  module.exports.cpu = cpu;

  module.exports.pswBits = pswBits;
  module.exports.pconBits = pconBits;
  module.exports.sconBits = sconBits;
  module.exports.ipBits = ipBits;
  module.exports.ieBits = ieBits;
  module.exports.tmodBits = tmodBits;
  module.exports.tconBits = tconBits;
  module.exports.t2conBits = t2conBits;
}


