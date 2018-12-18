const PMEMSize = 65536;
const XRAMSize = 65536;

const opTable = [
  /* 00 */ {n: 1, name: "NOP", operands: ""},
  /* 01 */ {n: 2, name: "AJMP", operands: "addr11"},
  /* 02 */ {n: 3, name: "LJMP", operands: "addr16"},
  /* 03 */ {n: 1, name: "RR", operands: "A"},
  /* 04 */ {n: 1, name: "INC", operands: "A"},
  /* 05 */ {n: 2, name: "INC", operands: "direct"},
  /* 06 */ {n: 1, name: "INC", operands: "@R0"},
  /* 07 */ {n: 1, name: "INC", operands: "@R1"},
  /* 08 */ {n: 1, name: "INC", operands: "R0"},
  /* 09 */ {n: 1, name: "INC", operands: "R1"},
  /* 0A */ {n: 1, name: "INC", operands: "R2"},
  /* 0B */ {n: 1, name: "INC", operands: "R3"},
  /* 0C */ {n: 1, name: "INC", operands: "R4"},
  /* 0D */ {n: 1, name: "INC", operands: "R5"},
  /* 0E */ {n: 1, name: "INC", operands: "R6"},
  /* 0F */ {n: 1, name: "INC", operands: "R7"},
  /* 10 */ {n: 3, name: "JBC", operands: "bit, offset"},
  /* 11 */ {n: 2, name: "ACALL", operands: "addr11"},
  /* 12 */ {n: 3, name: "LCALL", operands: "addr16"},
  /* 13 */ {n: 1, name: "RRC", operands: "A"},
  /* 14 */ {n: 1, name: "DEC", operands: "A"},
  /* 15 */ {n: 2, name: "DEC", operands: "direct"},
  /* 16 */ {n: 1, name: "DEC", operands: "@R0"},
  /* 17 */ {n: 1, name: "DEC", operands: "@R1"},
  /* 18 */ {n: 1, name: "DEC", operands: "R0"},
  /* 19 */ {n: 1, name: "DEC", operands: "R1"},
  /* 1A */ {n: 1, name: "DEC", operands: "R2"},
  /* 1B */ {n: 1, name: "DEC", operands: "R3"},
  /* 1C */ {n: 1, name: "DEC", operands: "R4"},
  /* 1D */ {n: 1, name: "DEC", operands: "R5"},
  /* 1E */ {n: 1, name: "DEC", operands: "R6"},
  /* 1F */ {n: 1, name: "DEC", operands: "R7"},
  /* 20 */ {n: 3, name: "JB", operands: "bit, offset"},
  /* 21 */ {n: 2, name: "AJMP", operands: "addr11"},
  /* 22 */ {n: 1, name: "RET", operands: ""},
  /* 23 */ {n: 1, name: "RL", operands: "A"},
  /* 24 */ {n: 2, name: "ADD", operands: "A, #immed"},
  /* 25 */ {n: 2, name: "ADD", operands: "A, direct"},
  /* 26 */ {n: 1, name: "ADD", operands: "A, @R0"},
  /* 27 */ {n: 1, name: "ADD", operands: "A, @R1"},
  /* 28 */ {n: 1, name: "ADD", operands: "A, R0"},
  /* 29 */ {n: 1, name: "ADD", operands: "A, R1"},
  /* 2A */ {n: 1, name: "ADD", operands: "A, R2"},
  /* 2B */ {n: 1, name: "ADD", operands: "A, R3"},
  /* 2C */ {n: 1, name: "ADD", operands: "A, R4"},
  /* 2D */ {n: 1, name: "ADD", operands: "A, R5"},
  /* 2E */ {n: 1, name: "ADD", operands: "A, R6"},
  /* 2F */ {n: 1, name: "ADD", operands: "A, R7"},
  /* 30 */ {n: 3, name: "JNB", operands: "bit, offset"},
  /* 31 */ {n: 2, name: "ACALL", operands: "addr11"},
  /* 32 */ {n: 1, name: "RETI", operands: ""},
  /* 33 */ {n: 1, name: "RLC", operands: "A"},
  /* 34 */ {n: 2, name: "ADDC", operands: "A, #immed"},
  /* 35 */ {n: 2, name: "ADDC", operands: "A, direct"},
  /* 36 */ {n: 1, name: "ADDC", operands: "A, @R0"},
  /* 37 */ {n: 1, name: "ADDC", operands: "A, @R1"},
  /* 38 */ {n: 1, name: "ADDC", operands: "A, R0"},
  /* 39 */ {n: 1, name: "ADDC", operands: "A, R1"},
  /* 3A */ {n: 1, name: "ADDC", operands: "A, R2"},
  /* 3B */ {n: 1, name: "ADDC", operands: "A, R3"},
  /* 3C */ {n: 1, name: "ADDC", operands: "A, R4"},
  /* 3D */ {n: 1, name: "ADDC", operands: "A, R5"},
  /* 3E */ {n: 1, name: "ADDC", operands: "A, R6"},
  /* 3F */ {n: 1, name: "ADDC", operands: "A, R7"},
  /* 40 */ {n: 2, name: "JC", operands: "offset"},
  /* 41 */ {n: 2, name: "AJMP", operands: "addr11"},
  /* 42 */ {n: 2, name: "ORL", operands: "direct, A"},
  /* 43 */ {n: 3, name: "ORL", operands: "direct, #immed"},
  /* 44 */ {n: 2, name: "ORL", operands: "A, #immed"},
  /* 45 */ {n: 2, name: "ORL", operands: "A, direct"},
  /* 46 */ {n: 1, name: "ORL", operands: "A, @R0"},
  /* 47 */ {n: 1, name: "ORL", operands: "A, @R1"},
  /* 48 */ {n: 1, name: "ORL", operands: "A, R0"},
  /* 49 */ {n: 1, name: "ORL", operands: "A, R1"},
  /* 4A */ {n: 1, name: "ORL", operands: "A, R2"},
  /* 4B */ {n: 1, name: "ORL", operands: "A, R3"},
  /* 4C */ {n: 1, name: "ORL", operands: "A, R4"},
  /* 4D */ {n: 1, name: "ORL", operands: "A, R5"},
  /* 4E */ {n: 1, name: "ORL", operands: "A, R6"},
  /* 4F */ {n: 1, name: "ORL", operands: "A, R7"},
  /* 50 */ {n: 2, name: "JNC", operands: "offset"},
  /* 51 */ {n: 2, name: "ACALL", operands: "addr11"},
  /* 52 */ {n: 2, name: "ANL", operands: "direct, A"},
  /* 53 */ {n: 3, name: "ANL", operands: "direct, #immed"},
  /* 54 */ {n: 2, name: "ANL", operands: "A, #immed"},
  /* 55 */ {n: 2, name: "ANL", operands: "A, direct"},
  /* 56 */ {n: 1, name: "ANL", operands: "A, @R0"},
  /* 57 */ {n: 1, name: "ANL", operands: "A, @R1"},
  /* 58 */ {n: 1, name: "ANL", operands: "A, R0"},
  /* 59 */ {n: 1, name: "ANL", operands: "A, R1"},
  /* 5A */ {n: 1, name: "ANL", operands: "A, R2"},
  /* 5B */ {n: 1, name: "ANL", operands: "A, R3"},
  /* 5C */ {n: 1, name: "ANL", operands: "A, R4"},
  /* 5D */ {n: 1, name: "ANL", operands: "A, R5"},
  /* 5E */ {n: 1, name: "ANL", operands: "A, R6"},
  /* 5F */ {n: 1, name: "ANL", operands: "A, R7"},
  /* 60 */ {n: 2, name: "JZ", operands: "offset"},
  /* 61 */ {n: 2, name: "AJMP", operands: "addr11"},
  /* 62 */ {n: 2, name: "XRL", operands: "direct, A"},
  /* 63 */ {n: 3, name: "XRL", operands: "direct, #immed"},
  /* 64 */ {n: 2, name: "XRL", operands: "A, #immed"},
  /* 65 */ {n: 2, name: "XRL", operands: "A, direct"},
  /* 66 */ {n: 1, name: "XRL", operands: "A, @R0"},
  /* 67 */ {n: 1, name: "XRL", operands: "A, @R1"},
  /* 68 */ {n: 1, name: "XRL", operands: "A, R0"},
  /* 69 */ {n: 1, name: "XRL", operands: "A, R1"},
  /* 6A */ {n: 1, name: "XRL", operands: "A, R2"},
  /* 6B */ {n: 1, name: "XRL", operands: "A, R3"},
  /* 6C */ {n: 1, name: "XRL", operands: "A, R4"},
  /* 6D */ {n: 1, name: "XRL", operands: "A, R5"},
  /* 6E */ {n: 1, name: "XRL", operands: "A, R6"},
  /* 6F */ {n: 1, name: "XRL", operands: "A, R7"},
  /* 70 */ {n: 2, name: "JNZ", operands: "offset"},
  /* 71 */ {n: 2, name: "ACALL", operands: "addr11"},
  /* 72 */ {n: 2, name: "ORL", operands: "C, bit"},
  /* 73 */ {n: 1, name: "JMP", operands: "@A+DPTR"},
  /* 74 */ {n: 2, name: "MOV", operands: "A, #immed"},
  /* 75 */ {n: 3, name: "MOV", operands: "direct, #immed"},
  /* 76 */ {n: 2, name: "MOV", operands: "@R0, #immed"},
  /* 77 */ {n: 2, name: "MOV", operands: "@R1, #immed"},
  /* 78 */ {n: 2, name: "MOV", operands: "R0, #immed"},
  /* 79 */ {n: 2, name: "MOV", operands: "R1, #immed"},
  /* 7A */ {n: 2, name: "MOV", operands: "R2, #immed"},
  /* 7B */ {n: 2, name: "MOV", operands: "R3, #immed"},
  /* 7C */ {n: 2, name: "MOV", operands: "R4, #immed"},
  /* 7D */ {n: 2, name: "MOV", operands: "R5, #immed"},
  /* 7E */ {n: 2, name: "MOV", operands: "R6, #immed"},
  /* 7F */ {n: 2, name: "MOV", operands: "R7, #immed	 	"},
  /* 80 */ {n: 2, name: "SJMP", operands: "offset"},
  /* 81 */ {n: 2, name: "AJMP", operands: "addr11"},
  /* 82 */ {n: 2, name: "ANL", operands: "C, bit"},
  /* 83 */ {n: 1, name: "MOVC", operands: "A, @A+PC"},
  /* 84 */ {n: 1, name: "DIV", operands: "AB"},
  /* 85 */ {n: 3, name: "MOV", operands: "direct, direct"},
  /* 86 */ {n: 2, name: "MOV", operands: "direct, @R0"},
  /* 87 */ {n: 2, name: "MOV", operands: "direct, @R1"},
  /* 88 */ {n: 2, name: "MOV", operands: "direct, R0"},
  /* 89 */ {n: 2, name: "MOV", operands: "direct, R1"},
  /* 8A */ {n: 2, name: "MOV", operands: "direct, R2"},
  /* 8B */ {n: 2, name: "MOV", operands: "direct, R3"},
  /* 8C */ {n: 2, name: "MOV", operands: "direct, R4"},
  /* 8D */ {n: 2, name: "MOV", operands: "direct, R5"},
  /* 8E */ {n: 2, name: "MOV", operands: "direct, R6"},
  /* 8F */ {n: 2, name: "MOV", operands: "direct, R7"},
  /* 90 */ {n: 3, name: "MOV", operands: "DPTR, #immed"},
  /* 91 */ {n: 2, name: "ACALL", operands: "addr11"},
  /* 92 */ {n: 2, name: "MOV", operands: "bit, C"},
  /* 93 */ {n: 1, name: "MOVC", operands: "A, @A+DPTR"},
  /* 94 */ {n: 2, name: "SUBB", operands: "A, #immed"},
  /* 95 */ {n: 2, name: "SUBB", operands: "A, direct"},
  /* 96 */ {n: 1, name: "SUBB", operands: "A, @R0"},
  /* 97 */ {n: 1, name: "SUBB", operands: "A, @R1"},
  /* 98 */ {n: 1, name: "SUBB", operands: "A, R0"},
  /* 99 */ {n: 1, name: "SUBB", operands: "A, R1"},
  /* 9A */ {n: 1, name: "SUBB", operands: "A, R2"},
  /* 9B */ {n: 1, name: "SUBB", operands: "A, R3"},
  /* 9C */ {n: 1, name: "SUBB", operands: "A, R4"},
  /* 9D */ {n: 1, name: "SUBB", operands: "A, R5"},
  /* 9E */ {n: 1, name: "SUBB", operands: "A, R6"},
  /* 9F */ {n: 1, name: "SUBB", operands: "A, R7"},
  /* A0 */ {n: 2, name: "ORL", operands: "C, /bit"},
  /* A1 */ {n: 2, name: "AJMP", operands: "addr11"},
  /* A2 */ {n: 2, name: "MOV", operands: "C, bit"},
  /* A3 */ {n: 1, name: "INC", operands: "DPTR"},
  /* A4 */ {n: 1, name: "MUL", operands: "AB"},
  /* A5 */ {n: 1, name: "reserved", operands: ""},
  /* A6 */ {n: 2, name: "MOV", operands: "@R0, direct"},
  /* A7 */ {n: 2, name: "MOV", operands: "@R1, direct"},
  /* A8 */ {n: 2, name: "MOV", operands: "R0, direct"},
  /* A9 */ {n: 2, name: "MOV", operands: "R1, direct"},
  /* AA */ {n: 2, name: "MOV", operands: "R2, direct"},
  /* AB */ {n: 2, name: "MOV", operands: "R3, direct"},
  /* AC */ {n: 2, name: "MOV", operands: "R4, direct"},
  /* AD */ {n: 2, name: "MOV", operands: "R5, direct"},
  /* AE */ {n: 2, name: "MOV", operands: "R6, direct"},
  /* AF */ {n: 2, name: "MOV", operands: "R7, direct"},
  /* B0 */ {n: 2, name: "ANL", operands: "C, /bit"},
  /* B1 */ {n: 2, name: "ACALL", operands: "addr11"},
  /* B2 */ {n: 2, name: "CPL", operands: "bit"},
  /* B3 */ {n: 1, name: "CPL", operands: "C"},
  /* B4 */ {n: 3, name: "CJNE", operands: "A, #immed, offset"},
  /* B5 */ {n: 3, name: "CJNE", operands: "A, direct, offset"},
  /* B6 */ {n: 3, name: "CJNE", operands: "@R0, #immed, offset"},
  /* B7 */ {n: 3, name: "CJNE", operands: "@R1, #immed, offset"},
  /* B8 */ {n: 3, name: "CJNE", operands: "R0, #immed, offset"},
  /* B9 */ {n: 3, name: "CJNE", operands: "R1, #immed, offset"},
  /* BA */ {n: 3, name: "CJNE", operands: "R2, #immed, offset"},
  /* BB */ {n: 3, name: "CJNE", operands: "R3, #immed, offset"},
  /* BC */ {n: 3, name: "CJNE", operands: "R4, #immed, offset"},
  /* BD */ {n: 3, name: "CJNE", operands: "R5, #immed, offset"},
  /* BE */ {n: 3, name: "CJNE", operands: "R6, #immed, offset"},
  /* BF */ {n: 3, name: "CJNE", operands: "R7, #immed, offset"},
  /* C0 */ {n: 2, name: "PUSH", operands: "direct"},
  /* C1 */ {n: 2, name: "AJMP", operands: "addr11"},
  /* C2 */ {n: 2, name: "CLR", operands: "bit"},
  /* C3 */ {n: 1, name: "CLR", operands: "C"},
  /* C4 */ {n: 1, name: "SWAP", operands: "A"},
  /* C5 */ {n: 2, name: "XCH", operands: "A, direct"},
  /* C6 */ {n: 1, name: "XCH", operands: "A, @R0"},
  /* C7 */ {n: 1, name: "XCH", operands: "A, @R1"},
  /* C8 */ {n: 1, name: "XCH", operands: "A, R0"},
  /* C9 */ {n: 1, name: "XCH", operands: "A, R1"},
  /* CA */ {n: 1, name: "XCH", operands: "A, R2"},
  /* CB */ {n: 1, name: "XCH", operands: "A, R3"},
  /* CC */ {n: 1, name: "XCH", operands: "A, R4"},
  /* CD */ {n: 1, name: "XCH", operands: "A, R5"},
  /* CE */ {n: 1, name: "XCH", operands: "A, R6"},
  /* CF */ {n: 1, name: "XCH", operands: "A, R7"},
  /* D0 */ {n: 2, name: "POP", operands: "direct"},
  /* D1 */ {n: 2, name: "ACALL", operands: "addr11"},
  /* D2 */ {n: 2, name: "SETB", operands: "bit"},
  /* D3 */ {n: 1, name: "SETB", operands: "C"},
  /* D4 */ {n: 1, name: "DA", operands: "A"},
  /* D5 */ {n: 3, name: "DJNZ", operands: "direct, offset"},
  /* D6 */ {n: 1, name: "XCHD", operands: "A, @R0"},
  /* D7 */ {n: 1, name: "XCHD", operands: "A, @R1"},
  /* D8 */ {n: 2, name: "DJNZ", operands: "R0, offset"},
  /* D9 */ {n: 2, name: "DJNZ", operands: "R1, offset"},
  /* DA */ {n: 2, name: "DJNZ", operands: "R2, offset"},
  /* DB */ {n: 2, name: "DJNZ", operands: "R3, offset"},
  /* DC */ {n: 2, name: "DJNZ", operands: "R4, offset"},
  /* DD */ {n: 2, name: "DJNZ", operands: "R5, offset"},
  /* DE */ {n: 2, name: "DJNZ", operands: "R6, offset"},
  /* DF */ {n: 2, name: "DJNZ", operands: "R7, offset"},
  /* E0 */ {n: 1, name: "MOVX", operands: "A, @DPTR"},
  /* E1 */ {n: 2, name: "AJMP", operands: "addr11"},
  /* E2 */ {n: 1, name: "MOVX", operands: "A, @R0"},
  /* E3 */ {n: 1, name: "MOVX", operands: "A, @R1"},
  /* E4 */ {n: 1, name: "CLR", operands: "A"},
  /* E5 */ {n: 2, name: "MOV", operands: "A, direct"},
  /* E6 */ {n: 1, name: "MOV", operands: "A, @R0"},
  /* E7 */ {n: 1, name: "MOV", operands: "A, @R1"},
  /* E8 */ {n: 1, name: "MOV", operands: "A, R0"},
  /* E9 */ {n: 1, name: "MOV", operands: "A, R1"},
  /* EA */ {n: 1, name: "MOV", operands: "A, R2"},
  /* EB */ {n: 1, name: "MOV", operands: "A, R3"},
  /* EC */ {n: 1, name: "MOV", operands: "A, R4"},
  /* ED */ {n: 1, name: "MOV", operands: "A, R5"},
  /* EE */ {n: 1, name: "MOV", operands: "A, R6"},
  /* EF */ {n: 1, name: "MOV", operands: "A, R7"},
  /* F0 */ {n: 1, name: "MOVX", operands: "@DPTR, A"},
  /* F1 */ {n: 2, name: "ACALL", operands: "addr11"},
  /* F2 */ {n: 1, name: "MOVX", operands: "@R0, A"},
  /* F3 */ {n: 1, name: "MOVX", operands: "@R1, A"},
  /* F4 */ {n: 1, name: "CPL", operands: "A"},
  /* F5 */ {n: 2, name: "MOV", operands: "direct, A"},
  /* F6 */ {n: 1, name: "MOV", operands: "@R0, A"},
  /* F7 */ {n: 1, name: "MOV", operands: "@R1, A"},
  /* F8 */ {n: 1, name: "MOV", operands: "R0, A"},
  /* F9 */ {n: 1, name: "MOV", operands: "R1, A"},
  /* FA */ {n: 1, name: "MOV", operands: "R2, A"},
  /* FB */ {n: 1, name: "MOV", operands: "R3, A"},
  /* FC */ {n: 1, name: "MOV", operands: "R4, A"},
  /* FD */ {n: 1, name: "MOV", operands: "R5, A"},
  /* FE */ {n: 1, name: "MOV", operands: "R6, A"},
  /* FF */ {n: 1, name: "MOV", operands: "R7, A"},
];


const sfr = {
  acc: 0xE0,
  b: 0xF0,
  psw: 0xD0,
  sp: 0x81,
  dpl: 0x82,
  dph: 0x83,
  p0: 0x80,
  p1: 0x90,
  p2: 0xA0,
  p3: 0xB0,
  ip: 0xB8,
  ie: 0xA8,
  tmod: 0x89,
  tcon: 0x88,
  t2con: 0xC8,
  t2mod: 0xC9,
  th0: 0x8C,
  tl0: 0x8A,
  th1: 0x8D,
  tl1: 0x8B,
  th2: 0xCD,
  tl2: 0xCC,
  rcap2h: 0xCB,
  rcap2l: 0xCA,
  scon: 0x98,
  sbuf: 0x99,
  pcon: 0x87,
};

const pconBits = makeBits('smod . . . gf1 gf0 pd idl');
const sconBits = makeBits('sm0 sm1 sm2 ren tb8 rb8 ti ri');
const tconBits = makeBits('tf1 tr1 tf0 tr0 ie1 it1 ie0 it0');
const tmodBits = makeBits('gate1 ct1 t1m1 t1m0 gate0 ct0 t0m1 t0m0');
const ieBits = makeBits('ea . et2 es et1 ex1 et0 ex0');
const ipBits = makeBits('. . pt2 ps pt1 px1 pt0 px0');

const parity = [
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
  pc: 0,
  sp: 0x07,
  dptr: 0,
  a: 0,
  b: 0,

  psw: 0,
  p: 0,
  ud: 0,
  ov: 0,
  rs0: 0,
  rs1: 0,
  f0: 0,
  ac: 0,
  c: 0,

  p0: 0xFF,
  p1: 0xFF,
  p2: 0xFF,
  p3: 0xFF,

  pcon: 0,
  scon: 0,
  tcon: 0,
  tmod: 0,
  ie: 0,
  ip: 0,
  t0: 0,
  t1: 0,

  // Interrupt priority level.
  // -1: No interrupt in progress.
  // 0: Low priority in progress.
  // 1: High priority in progress.
  ipl: -1,

  tracing: true,
  running: true,

  iram: Buffer.alloc(256, 0x00, 'binary'),
  pmem: Buffer.alloc(PMEMSize, 0x00, 'binary'),
  xram: Buffer.alloc(XRAMSize, 0x00, 'binary'),

  updatePSW() {
    this.p = parity[this.a];
    this.psw = 
      this.p | this.ud << 1 |
      this.ov << 2 | this.rs0 << 3 |
      this.rs1 << 4 | this.f0 << 5 |
      this.ac << 6 | this.c << 7;
    return this.psw;
  },


  getPSW() {
    this.updatePSW();
    return this.psw;
  },


  push1(v) {
    this.iram[++this.sp] = v;
  },

  push2(v) {
    this.push1(v & 0xFF);
    this.push1(v >>> 8);
  },


  doADD(op, b) {
    const c = op & 0x10 ? this.c : 0;
    const a = this.a + b + c;
    // There is no overflow if
    // * Both operands are positive and sum is positive or
    // * Both operands are negative and sum is negative.
    const aSign = !!(this.a & 0x80);
    const bSign = !!((b + c) & 0x80);
    const sSign = !!(a & 0x80);
    this.ov = !(aSign == bSign && aSign == sSign);
    this.ac = ((a & 0x0F) + ((b + c) & 0x0F)) > 0x0F;
    this.c = a > 0xFF ? 1 : 0;
    this.a = a & 0xFF;
  },


  doSUBB(op, b) {
    const toSub = b + this.c;

    this.ac = (toSub & 0x0F) > (this.a & 0x0F) ? 1 : 0;
    this.c = toSub > this.a ? 1 : 0;
    this.a = (this.a - toSub) & 0xFF;
    a = this.toSigned(this.a) - this.toSigned(toSub);
    this.ov = a < -128 || a > 127 ? 1 : 0;
  },


  toSigned(v) {
    return v & 0x80 ? v - 0x100 : v;
  },


  getR(r) {
    const ra = (this.rs0 << 3) | (this.rs1 << 4);
    return this.iram[ra];
  },


  putR(v, r) {
    const ra = (this.rs0 << 3) | (this.rs1 << 4);
    this.iram[ra] = v & 0xFF;
  },


  getIRAM(ra) {
    // XXX: TODO: Implement SFRs
    return this.iram[ra];
  },


  putIRAM(v, ra) {
    // XXX: TODO: Implement SFRs
    this.iram[ra] = v & 0xFF;
  },


  getBit(bn) {
    const bm = 1 << (bn & 0x07);

    if (bn < 0x30) {
      const ba = 0x20 + (bn >> 3);
      return (this.iram[ba] & bm) ? 1 : 0;
    } else {
      const ba = bn & 0xF8;
      return (this.getIRAM(ba) & bm) ? 1 : 0;
    }
  },


  putBit(b, bn) {
    const bm = 1 << (bn & 0x07);

    if (bn < 0x30) {
      const ba = 0x20 + (bn >> 3);
      const v = this.iram[ba];

      if (b) {
        v = v | bm;
      } else {
        v = v & ~bm;
      }

      this.iram[ba] = v;
    } else {
      const ba = bn & 0xF8;
      const v = this.getIRAM(ba);

      if (b) {
        v = v | bm;
      } else {
        v = v & ~bm;
      }

      this.putIRAM(v, ba);
    }
  },


  disassemble(pc) {
    const op = this.pmem[pc];
    const ope = opTable[op];
    return `\
${toHex4(this.pc-1)}: \
${this.pmem.slice(pc, pc + ope.n).toString('hex')
  .match(/.{2}/g)
  .join(' ')
}  \
${ope.name} ${ope.operands}`;
  },


  run() {

    while (this.running) {
      let rela;
      let ira;
      let imm;
      let bit;
      let b2;
      let a;
      let b;
      let c;
      let r;

      const op = this.pmem[this.pc++];

      if (this.tracing) {
        const regs = [0, 1, 2, 3, 4, 5, 6, 7];
        console.log(`
${this.disassemble(this.pc-1)}
a=${toHex2(this.a)}  b=${toHex2(this.b)}  \
sp=${toHex2(this.sp)}  psw=${toHex2(this.getPSW())}  dptr=${toHex4(this.dptr)}
${regs
  .map((v, rn) => `r${rn}=${toHex2(this.getR(rn))}`)
  .join('  ')
}`);
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
        b2 = this.pmem[this.pc++];
        this.push2(this.pc);
        this.pc = (this.pc & 0xF800) | ((op & 0xE0) << 3) | b2;
        break;


      ////////// ADD/ADDC
      case 0x24:                // ADD A,#imm
      case 0x34:                // ADDC A,#imm
        imm = this.pmem[this.pc++];
        this.doADD(op, imm);
        break;

      case 0x25:                // ADD A,dir
      case 0x35:                // ADDC A,dir
        ira = this.pmem[this.pc++];
        this.doADD(op, this.getIRAM(ira));
        break;

      case 0x26:                // ADD A,@R0
      case 0x27:                // ADD A,@R1
      case 0x36:                // ADDC A,@R0
      case 0x37:                // ADDC A,@R1
        ira = this.getR(op & 1);
        this.doADD(op, this.iram[ira]);
        break;

      case 0x28:                // ADD Rn
      case 0x29:                // ADD Rn
      case 0x2A:                // ADD Rn
      case 0x2B:                // ADD Rn
      case 0x2C:                // ADD Rn
      case 0x2D:                // ADD Rn
      case 0x2E:                // ADD Rn
      case 0x2F:                // ADD Rn
      case 0x38:                // ADDC Rn
      case 0x39:                // ADDC Rn
      case 0x3A:                // ADDC Rn
      case 0x3B:                // ADDC Rn
      case 0x3C:                // ADDC Rn
      case 0x3D:                // ADDC Rn
      case 0x3E:                // ADDC Rn
      case 0x3F:                // ADDC Rn
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
        b2 = this.pmem[this.pc++];
        this.pc = (this.pc & 0xF800) | ((op & 0xE0) << 3) | b2;
        break;


      ////////// ANL
      case 0x52:                // ANL dir,A
        ira = this.pmem[this.pc++];
        a = this.getIRAM(ira);
        this.putIRAM(this.a & a, ira);
        break;

      case 0x53:                // ANL dir,#imm
        ira = this.pmem[this.pc++];
        this.putIRAM(this.a & this.getIRAM(ira), ira);
        break;

      case 0x54:                // ANL A,#imm
        imm = this.pmem[this.pc++];
        this.a = this.a & imm;
        break;

      case 0x55:                // ANL A,dir
        ira = this.pmem[this.pc++];
        this.a = this.a & this.getIRAM(ira);
        break;

      case 0x56:                // ANL A,@R0
      case 0x57:                // ANL A,@R1
        ira = this.getR(op & 1);
        this.a = this.a & this.iram[ira];
        break;

      case 0x58:                // ANL A,Rn
      case 0x59:                // ANL A,Rn
      case 0x5A:                // ANL A,Rn
      case 0x5B:                // ANL A,Rn
      case 0x5C:                // ANL A,Rn
      case 0x5D:                // ANL A,Rn
      case 0x5E:                // ANL A,Rn
      case 0x5F:                // ANL A,Rn
        r = op & 0x07;
        this.a = this.a & this.getR(r);
        break;

      case 0x82:                // ANL C,bit
        bit = this.pmem[this.pc++];
        b = this.getBit(bit);
        this.c = this.c & b;
        break;

      case 0xB0:                // ANL C,/bit
        bit = this.pmem[this.pc++];
        b = this.getBit(bit);
        this.c = this.c & (1 ^ b);
        break;


      ////////// CJNE
      case 0xB4:                // CJNE A,#imm,rela
        a = this.a;
        imm = this.pmem[this.pc++];
        b = imm;
        rela = this.toSigned(this.pmem[this.pc++]);
        if (a === b) this.pc += rela;
        this.c = a < b ? 1 : 0;
        break;

      case 0xB5:                // CJNE A,dir,rela
        a = this.a;
        ira = this.pmem[this.pc++];
        b = this.getIRAM(ira);
        rela = this.toSigned(this.pmem[this.pc++]);
        if (a === b) this.pc += rela;
        this.c = a < b ? 1 : 0;
        break;

      case 0xB6:                // CJNE @R0,#imm,rela
      case 0xB7:                // CJNE @R1,#imm,rela
        r = op & 1;
        a = this.iram[this.getR(r)];
        imm = this.pmem[this.pc++];
        b = imm;
        rela = this.toSigned(this.pmem[this.pc++]);
        if (a === b) this.pc += rela;
        this.c = a < b ? 1 : 0;
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
        imm = this.pmem[this.pc++];
        b = imm;
        rela = this.toSigned(this.pmem[this.pc++]);
        if (a === b) this.pc += rela;
        this.c = a < b ? 1 : 0;
        break;

      ////////// CLR
      case 0xC2:                // CLR bit
        bit = this.xmem[this.pc++];
        this.putBit(0, bit);
        break;
        
      case 0xC3:                // CLR C
        this.c = 0;
        break;
        
      case 0xE4:                // CLR A
        this.a = 0;
        break;
        

      ////////// CPL
      case 0xB2:                // CPL bit
        bit = this.xmem[this.pc++];
        this.putBit(1 ^ this.getBit(bit), bit);
        break;
        
      case 0xB3:                // CPL C
        this.c = 1 ^ this.c;
        break;
        
      case 0xF4:                // CPL A
        this.a = 0xFF ^ this.a;
        break;
        

      ////////// DA
      case 0xD4:                // DA A
        if (this.ac || (this.a & 0x0F) > 9) this.a = this.a + 0x06;
        if (this.a > 0xFF) this.c = 1;
        if (this.c || (this.a & 0xF0) > 0x90) this.a = this.a + 0x60;
        if (this.a > 0xFF) this.c = 1;
        this.a = this.a & 0xFF;
        break;
        

      ////////// DEC
      case 0x04:                // DEC A
        this.a = (this.a - 1) & 0xFF;
        break;

      case 0x05:                // DEC dir
        ira = this.pmem[this.pc++];
        this.putIRAM(this.getIRAM(ira) - 1, ira);
        break;

      case 0x06:                // DEC @R0
      case 0x07:                // DEC @R1
        ira = this.getR(op & 1);
        this.putIRAM(this.iram[ira] - 1, ira);
        break;

      case 0x08:                // DEC Rn
      case 0x09:                // DEC Rn
      case 0x0A:                // DEC Rn
      case 0x0B:                // DEC Rn
      case 0x0C:                // DEC Rn
      case 0x0D:                // DEC Rn
      case 0x0E:                // DEC Rn
      case 0x0F:                // DEC Rn
        r = op & 0x07;
        this.putR(this.getR(r) - 1, r);
        break;

      case 0xA3:                // DEC DPTR
        this.dptr = (this.dptr - 1) & 0xFFFF;
        break;


      ////////// DIV
      case 0x84:                // DIV AB
        this.c = 0;

        if (this.b === 0) {
          this.ov = 1;
        } else {
          this.ov = 0;
          this.a = Math.floor(this.a / this.b);
        }

        break;


      ////////// DJNZ
      case 0xD5:                // DJNZ dir,rela
        ira = this.pmem[this.pc++];
        a = this.getIRAM(ira) - 1;
        rela = this.toSigned(this.pmem[this.pc++]);
        if (a !== 0) this.pc += rela;
        this.putIRAM(a, ira);
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
        rela = this.toSigned(this.pmem[this.pc++]);
        if (a !== 0) this.pc += rela;
        this.putR(a, r);
        break;


      ////////// INC
      case 0x04:                // INC A
        this.a = (this.a + 1) & 0xFF;
        break;

      case 0x05:                // INC dir
        ira = this.pmem[this.pc++];
        this.putIRAM(this.getIRAM(ira) + 1, ira);
        break;

      case 0x06:                // INC @R0
      case 0x07:                // INC @R1
        ira = this.getR(op & 1);
        this.putIRAM(this.iram[ira] + 1, ira);
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
        this.putR(this.getR(r) + 1, r);
        break;

      case 0xA3:                // INC DPTR
        this.dptr = (this.dptr + 1) & 0xFFFF;
        break;


      ////////// JB
      case 0x20:                // JB bit,rela
        bit = this.pmem[this.pc++];
        b = this.getBit(bit);
        rela = this.toSigned(this.pmem[this.pc++]);
        if (b) this.pc += rela;
        break;


      ////////// JBC
      case 0x10:                // JBC bit,rela
        bit = this.pmem[this.pc++];
        b = this.getBit(bit);
        rela = this.toSigned(this.pmem[this.pc++]);

        if (!b) {
          this.pc += rela;
          this.putBit(0, bit);
        }

        break;


      ////////// JC
      case 0x40:                // JC rela
        rela = this.toSigned(this.pmem[this.pc++]);
        if (this.c) this.pc += rela;
        break;


      ////////// JMP
      case 0x73:                // JMP @A+DPTR
        this.pc = (this.a + this.dptr) & 0xFFFF;
        break;


      ////////// JNB
      case 0x30:                // JNB bit,rela
        bit = this.pmem[this.pc++];
        b = this.getBit(bit);
        rela = this.toSigned(this.pmem[this.pc++]);
        if (!b) this.pc += rela;
        break;


      ////////// JNC
      case 0x50:                // JNC rela
        rela = this.toSigned(this.pmem[this.pc++]);
        if (!this.c) this.pc += rela;
        break;


      ////////// JNZ
      case 0x70:                // JNZ rela
        rela = this.toSigned(this.pmem[this.pc++]);
        if (this.a !== 0) this.pc += rela;
        break;


      ////////// JZ
      case 0x60:                // JZ rela
        rela = this.toSigned(this.pmem[this.pc++]);
        if (this.a === 0) this.pc += rela;
        break;


      ////////// LCALL
      case 0x12:                // LCALL addr16
        a = this.pmem[this.pc++];
        b = this.pmem[this.pc++];
        this.push2(this.pc);
        this.pc = (a << 8) | b;
        break;


      ////////// LJMP
      case 0x02:                // LJMP addr16
        a = this.pmem[this.pc++];
        b = this.pmem[this.pc++];
        this.pc = (a << 8) | b;
        break;


      ////////// MOV
      case 0x76:                // MOV @R0,#imm
      case 0x77:                // MOV @R1,#imm
        imm = this.pmem[this.pc++];
        r = op & 1;
        ira = this.getR(r);
        this.iram[ira] = imm;
        break;

      case 0xF6:                // MOV @R0,a
      case 0xF7:                // MOV @R1,a
        r = op & 1;
        ira = this.getR(r);
        this.iram[ira] = this.a;
        break;

      case 0xA6:                // MOV @R0,dir
      case 0xA7:                // MOV @R1,dir
        ira = this.pmem[this.pc++];
        a = this.getIRAM(ira);
        r = op & 1;
        ira = this.getR(r);
        this.iram[ira] = a;
        break;

      case 0x74:                // MOV A,#imm
        this.a = this.pmem[this.pc++];
        break;

      case 0xE6:                // MOV A,@R0
      case 0xE7:                // MOV A,@R1
        ira = this.getR(r);
        this.a = this.iram[ira];
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
        this.a = this.getR(r);
        break;

      case 0xE5:                // MOV A,dir
        ira = this.pmem[this.pc++];
        this.a = this.getIRAM(ira);
        break;

      case 0xA2:                // MOV C,bit
        bit = this.pmem[this.pc++];
        this.c = this.getBit(bit);
        break;

      case 0x90:                // MOV DPTR,#imm16
        a = this.pmem[this.pc++];
        b = this.pmem[this.pc++];
        this.dptr = a | (b << 8);
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
        a = this.pmem[this.pc++];
        this.putR(a, r);
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
        this.putR(this.a, r);
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
        ira = this.pmem[this.pc++];
        this.putR(this.getIRAM(ira), r);
        break;

      case 0x92:                // MOV bit,C
        bit = this.pmem[this.pc++];
        this.putBit(this.c, bit);
        break;

      case 0x75:                // MOV dir,#imm
        ira = this.pmem[this.pc++];
        imm = this.pmem[this.pc++];
        this.putIRAM(imm, ira);
        break;

      case 0x86:                // MOV dir,@R0
      case 0x87:                // MOV dir,@R1
        ira = this.getR(r);
        a = this.iram[ira];
        ira = this.pmem[this.pc++];
        this.putIRAM(a, ira);
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
        a = this.getR(r);
        ira = this.pmem[this.pc++];
        this.putIRAM(a, ira);
        break;

      case 0x85:                // MOV dir,dir
        ira = this.pmem[this.pc++];
        a = this.getIRAM(ira);
        ira = this.pmem[this.pc++];
        this.putIRAM(a, ira);
        break;


      ////////// MOVC
      case 0x93:                // MOVC A,@A+DPTR
        this.a = this.pmem[(this.a + this.dptr) & 0xFFFF];
        break;

      case 0x83:                // MOVC A,@A+PC
        this.a = this.pmem[(this.a + this.pc) & 0xFFFF];
        break;


      ////////// MOVX
      case 0xF0:                // MOVX @DPTR,A
        this.p1 = this.dptr & 0xFF;
        this.p2 = this.dptr >>> 8;
        this.xmem[this.dptr] = this.a;
        break;

      case 0xF2:                // MOVX @R0,A
      case 0xF3:                // MOVX @R1,A
        r = op & 1;
        this.p1 = this.getR(r);
        this.xmem[(this.p2 << 8) | this.p1] = this.a;
        break;

      case 0xE0:                // MOVX A,@DPTR
        this.p1 = this.dptr & 0xFF;
        this.p2 = this.dptr >>> 8;
        this.a = this.xmem[this.dptr];
        break;

      case 0xE2:                // MOVX A,@R0
      case 0xE3:                // MOVX A,@R1
        r = op & 1;
        this.p1 = this.getR(r);
        this.a = this.xmem[(this.p2 << 8) | this.p1];
        break;


      ////////// MUL
      case 0xA4:                // MUL AB
        a = this.a * this.b;
        this.c = 0;
        this.ov = a > 0xFF ? 1 : 0;
        this.a = a & 0xFF;
        this.b = a >>> 8;
        break;


      ////////// ORL
      case 0x42:                // ORL dir,A
        ira = this.pmem[this.pc++];
        a = this.getIRAM(ira);
        this.putIRAM(this.a | a, ira);
        break;

      case 0x43:                // ORL dir,#imm
        ira = this.pmem[this.pc++];
        this.putIRAM(this.a | this.getIRAM(ira), ira);
        break;

      case 0x44:                // ORL A,#imm
        imm = this.pmem[this.pc++];
        this.a = this.a | imm;
        break;

      case 0x45:                // ORL A,dir
        ira = this.pmem[this.pc++];
        this.a = this.a | this.getIRAM(ira);
        break;

      case 0x46:                // ORL A,@R0
      case 0x47:                // ORL A,@R1
        ira = this.getR(op & 1);
        this.a = this.a | this.iram[ira];
        break;

      case 0x48:                // ORL A,Rn
      case 0x49:                // ORL A,Rn
      case 0x4A:                // ORL A,Rn
      case 0x4B:                // ORL A,Rn
      case 0x4C:                // ORL A,Rn
      case 0x4D:                // ORL A,Rn
      case 0x4E:                // ORL A,Rn
      case 0x4F:                // ORL A,Rn
        r = op & 0x07;
        this.a = this.a | this.getR(r);
        break;

      case 0x72:                // ORL C,bit
        bit = this.pmem[this.pc++];
        b = this.getBit(bit);
        this.c = this.c | b;
        break;

      case 0xA0:                // ORL C,/bit
        bit = this.pmem[this.pc++];
        b = 1 ^ this.getBit(bit);
        this.c = this.c | b;
        break;


      ////////// POP
      case 0xD0:                // POP dir
        ira = this.pmem[this.pc++];
        a = this.getIRAM(this.sp);
        this.putIRAM(a, ira);
        this.sp = (this.sp - 1) & 0xFF;
        break;


      ////////// PUSH
      case 0xC0:                // PUSH dir
        ira = this.pmem[this.pc++];
        a = this.getIRAM(ira);
        this.sp = (this.sp + 1) & 0xFF;
        this.putIRAM(a, this.sp);
        break;


      ////////// RET
      case 0x22:                // RET
        a = this.getIRAM(this.sp);
        this.sp = (this.sp - 1) & 0xFF;
        b = this.getIRAM(this.sp);
        this.sp = (this.sp - 1) & 0xFF;
        this.pc = (a << 8) | b;
        break;


      ////////// IRET
      case 0x32:                // IRET
        a = this.getIRAM(this.sp);
        this.sp = (this.sp - 1) & 0xFF;
        b = this.getIRAM(this.sp);
        this.sp = (this.sp - 1) & 0xFF;
        this.pc = (a << 8) | b;
        this.ipl = this.ipl - 1;
        break;


      ////////// RL
      case 0x23:                // RL A
        this.a = this.a << 1;
        this.a = (this.a & 0xFF) | (this.a >>> 8);
        break;


      ////////// RLC
      case 0x33:                // RLC A
        b = this.c;
        this.a = this.a << 1;
        this.c = this.a >>> 8;
        this.a = (this.a & 0xFF) | b;
        break;


      ////////// RR
      case 0x03:                // RR A
        a = this.a << 7;
        this.a = (this.a >>> 1) | a;
        break;


      ////////// RRC
      case 0x13:                // RRC A
        b = this.c << 7;
        this.c = this.a & 1;
        this.a = (this.a >>> 1) | b;
        break;


      ////////// SETB
      case 0xD2:                // SETB bit
        bit = this.xmem[this.pc++];
        this.putBit(1, bit);
        break;
        
      case 0xD3:                // SETB C
        this.c = 1;
        break;
        

      ////////// SJMP
      case 0x80:                // SJMP rela
        rela = this.toSigned(this.pmem[this.pc++]);
        this.pc = this.pc + rela;
        break;


      ////////// SUB/SUBB
      case 0x94:                // SUBB A,#imm
        imm = this.pmem[this.pc++];
        this.doSUBB(op, imm);
        break;

      case 0x95:                // SUBB A,dir
        ira = this.pmem[this.pc++];
        this.doSUBB(op, this.getIRAM(ira));
        break;

      case 0x96:                // SUBB A,@R0
      case 0x97:                // SUBB A,@R1
        ira = this.getR(op & 1);
        this.doSUBB(op, this.iram[ira]);
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
        this.a = ((this.a & 0xF) << 4) | (this.a >>> 4);
        break;


      ////////// UNDEFINED
      case 0xA5:                // UNDEFINED
        this.c = 1;
        break;


      ////////// XCH
      case 0xC6:                // XCH A,@R0
      case 0xC7:                // XCH A,@R1
        ira = this.getR(op & 1);
        a = this.iram[this.ira];
        this.iram[this.ira] = this.a;
        this.a = a;
        break;

      case 0xC8:                // XCH R0
      case 0xC9:                // XCH R1
      case 0xCA:                // XCH R2
      case 0xCB:                // XCH R3
      case 0xCC:                // XCH R4
      case 0xCD:                // XCH R5
      case 0xCE:                // XCH R6
      case 0xCF:                // XCH R7
        r = op & 0x07;
        a = this.getR(r);
        this.putR(this.a, r);
        this.a = a;
        break;

        
      ////////// XCHD
      case 0xD6:                // XCHD A,@R0
      case 0xD7:                // XCHD A,@R1
        ira = this.getR(op & 1);
        a = this.iram[ira];
        this.iram[ira] = (a & 0xF0) | (this.a & 0x0F);
        this.a = (this.a & 0xF0) | (a & 0x0F);
        break;


      ////////// XRL
      case 0x62:                // XRL dir,A
        ira = this.pmem[this.pc++];
        a = this.getIRAM(ira);
        this.putIRAM(this.a ^ a, ira);
        break;

      case 0x63:                // XRL dir,#imm
        ira = this.pmem[this.pc++];
        this.putIRAM(this.a ^ this.getIRAM(ira), ira);
        break;

      case 0x64:                // XRL A,#imm
        imm = this.pmem[this.pc++];
        this.a = this.a ^ imm;
        break;

      case 0x65:                // XRL A,dir
        ira = this.pmem[this.pc++];
        this.a = this.a ^ this.getIRAM(ira);
        break;

      case 0x66:                // XRL A,@R0
      case 0x67:                // XRL A,@R1
        ira = this.getR(op & 1);
        this.a = this.a ^ this.iram[ira];
        break;

      case 0x68:                // XRL A,Rn
      case 0x69:                // XRL A,Rn
      case 0x6A:                // XRL A,Rn
      case 0x6B:                // XRL A,Rn
      case 0x6C:                // XRL A,Rn
      case 0x6D:                // XRL A,Rn
      case 0x6E:                // XRL A,Rn
      case 0x6F:                // XRL A,Rn
        r = op & 0x07;
        this.a = this.a ^ this.getR(r);
        break;


      default:
        console.log(`\
Unimplmented opcode=0x${toHex2(op)} at 0x${toHex4(this.pc-1)}`);
        this.running = false;
        break;
      }
    }
  },
};


function toHex2(v) {
  return (v | 0x100000).toString(16).slice(-2) + '';
}

function toHex4(v) {
  return `${toHex2(v >>> 8)}${toHex2(v & 0xFF)}`;
}


// Take a string and return a bit field object containing xBit and
// xMask values for each bit. The string is a space separated list of
// fields left to right where the leftmost is bit #7 and rightmost is
// bit #0 and '.' is used for a reserved bit.
function makeBits(s) {
  const o = {};
  const names = s.split(/\s+/);

  names
    .reverse()
    .map((name, index) => {

      if (name !== '.') {
        o[name + 'Bit'] = index;
        o[name + 'Mask'] = 1 << index;
      }
    });

  return o;
}


try {
  test_makeBits;

  const s1 = 'a7 b6 c5 d4 e3 f2 g1 h0';
  console.log(`makeBits("${s1}")=`, makeBits(s1));

  const s2 = 'a7 b6 . d4 . f2 . h0';
  console.log(`makeBits("${s2}")=`, makeBits(s2));
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


const fs = require('fs');

const hexName = './samples/bas52/BASIC-52.HEX';
const hex = fs.readFileSync(hexName, {encoding: 'utf-8'});

const MemoryMap = require('nrf-intel-hex');
const memMap = MemoryMap.fromHex(hex);

for (let [base, block] of memMap) {
  console.log(`Block ${toHex4(base)}: ${toHex4(block.length)} bytes`);
  const buf = Buffer.from(block);
  buf.copy(cpu.pmem, base);
}

cpu.run();

