'use strict';

const fs = require('fs');
const util = require('util');
const _ = require('lodash');
const {toHex1, toHex2, toHex4} = require('./simutils');


const disOp = [
  "NOP:1|",                    // 00
  "AJMP:2|1:addr11",           // 01
  "LJMP:3|1:addr16",           // 02
  "RR:1|A",                    // 03
  "INC:1|A",                   // 04
  "INC:2|1:direct",            // 05
  "INC:1|@Ri",                 // 06
  "INC:1|@Ri",                 // 07
  "INC:1|Ri",                  // 08
  "INC:1|Ri",                  // 09
  "INC:1|Ri",                  // 0A
  "INC:1|Ri",                  // 0B
  "INC:1|Ri",                  // 0C
  "INC:1|Ri",                  // 0D
  "INC:1|Ri",                  // 0E
  "INC:1|Ri",                  // 0F
  "JBC:3|1:bit,2:rela",        // 10
  "ACALL:2|1:addr11",          // 11
  "LCALL:3|1:addr16",          // 12
  "RRC:1|A",                   // 13
  "DEC:1|A",                   // 14
  "DEC:2|1:direct",            // 15
  "DEC:1|@Ri",                 // 16
  "DEC:1|@Ri",                 // 17
  "DEC:1|Ri",                  // 18
  "DEC:1|Ri",                  // 19
  "DEC:1|Ri",                  // 1A
  "DEC:1|Ri",                  // 1B
  "DEC:1|Ri",                  // 1C
  "DEC:1|Ri",                  // 1D
  "DEC:1|Ri",                  // 1E
  "DEC:1|Ri",                  // 1F
  "JB:3|1:bit,2:rela",         // 20
  "AJMP:2|1:addr11",           // 21
  "RET:1|",                    // 22
  "RL:1|A",                    // 23
  "ADD:2|A,1:immed",           // 24
  "ADD:2|A,1:direct",          // 25
  "ADD:1|A,1:@Ri",             // 26
  "ADD:1|A,1:@Ri",             // 27
  "ADD:1|A,Ri",                // 28
  "ADD:1|A,Ri",                // 29
  "ADD:1|A,Ri",                // 2A
  "ADD:1|A,Ri",                // 2B
  "ADD:1|A,Ri",                // 2C
  "ADD:1|A,Ri",                // 2D
  "ADD:1|A,Ri",                // 2E
  "ADD:1|A,Ri",                // 2F
  "JNB:3|1:bit,2:rela",        // 30
  "ACALL:2|1:addr11",          // 31
  "RETI:1|",                   // 32
  "RLC:1|A",                   // 33
  "ADDC:2|A,1:immed",          // 34
  "ADDC:2|A,1:direct",         // 35
  "ADDC:1|A,@Ri",              // 36
  "ADDC:1|A,@Ri",              // 37
  "ADDC:1|A,Ri",               // 38
  "ADDC:1|A,Ri",               // 39
  "ADDC:1|A,Ri",               // 3A
  "ADDC:1|A,Ri",               // 3B
  "ADDC:1|A,Ri",               // 3C
  "ADDC:1|A,Ri",               // 3D
  "ADDC:1|A,Ri",               // 3E
  "ADDC:1|A,Ri",               // 3F
  "JC:2|1:rela",               // 40
  "AJMP:2|1:addr11",           // 41
  "ORL:2|A,1:direct",          // 42
  "ORL:3|1:direct,2:immed",    // 43
  "ORL:2|A,1:immed",           // 44
  "ORL:2|A,1:direct",          // 45
  "ORL:1|A,@Ri",               // 46
  "ORL:1|A,@Ri",               // 47
  "ORL:1|A,Ri",                // 48
  "ORL:1|A,Ri",                // 49
  "ORL:1|A,Ri",                // 4A
  "ORL:1|A,Ri",                // 4B
  "ORL:1|A,Ri",                // 4C
  "ORL:1|A,Ri",                // 4D
  "ORL:1|A,Ri",                // 4E
  "ORL:1|A,Ri",                // 4F
  "JNC:2|1:rela",              // 50
  "ACALL:2|1:addr11",          // 51
  "ANL:2|1:direct,A",          // 52
  "ANL:3|1:direct,2:immed",    // 53
  "ANL:2|A,1:immed",           // 54
  "ANL:2|A,1:direct",          // 55
  "ANL:1|A,@Ri",               // 56
  "ANL:1|A,@Ri",               // 57
  "ANL:1|A,Ri",                // 58
  "ANL:1|A,Ri",                // 59
  "ANL:1|A,Ri",                // 5A
  "ANL:1|A,Ri",                // 5B
  "ANL:1|A,Ri",                // 5C
  "ANL:1|A,Ri",                // 5D
  "ANL:1|A,Ri",                // 5E
  "ANL:1|A,Ri",                // 5F
  "JZ:2|1:rela",               // 60
  "AJMP:2|1:addr11",           // 61
  "XRL:2|1:direct,A",          // 62
  "XRL:3|1:direct,2:immed",    // 63
  "XRL:2|A,1:immed",           // 64
  "XRL:2|A,1:direct",          // 65
  "XRL:1|A,@Ri",               // 66
  "XRL:1|A,@Ri",               // 67
  "XRL:1|A,Ri",                // 68
  "XRL:1|A,Ri",                // 69
  "XRL:1|A,Ri",                // 6A
  "XRL:1|A,Ri",                // 6B
  "XRL:1|A,Ri",                // 6C
  "XRL:1|A,Ri",                // 6D
  "XRL:1|A,Ri",                // 6E
  "XRL:1|A,Ri",                // 6F
  "JNZ:2|1:rela",              // 70
  "ACALL:2|1:addr11",          // 71
  "ORL:2|C,1:bit",             // 72
  "JMP:1|@A+DPTR",             // 73
  "MOV:2|A,1:immed",           // 74
  "MOV:3|1:direct,2:immed",    // 75
  "MOV:2|@Ri,1:immed",         // 76
  "MOV:2|@Ri,1:immed",         // 77
  "MOV:2|Ri,1:immed",          // 78
  "MOV:2|Ri,1:immed",          // 79
  "MOV:2|Ri,1:immed",          // 7A
  "MOV:2|Ri,1:immed",          // 7B
  "MOV:2|Ri,1:immed",          // 7C
  "MOV:2|Ri,1:immed",          // 7D
  "MOV:2|Ri,1:immed",          // 7E
  "MOV:2|Ri,1:immed",          // 7F
  "SJMP:2|1:rela",             // 80
  "AJMP:2|1:addr11",           // 81
  "ANL:2|C,1:bit",             // 82
  "MOVC:1|A,@A+PC",            // 83
  "DIV:1|AB",                  // 84
  "MOV:3|2:direct,1:direct",   // 85
  "MOV:2|@Ri,1:direct",        // 86
  "MOV:2|@Ri,1:direct",        // 87
  "MOV:2|1:direct,Ri",         // 88
  "MOV:2|1:direct,Ri",         // 89
  "MOV:2|1:direct,Ri",         // 8A
  "MOV:2|1:direct,Ri",         // 8B
  "MOV:2|1:direct,Ri",         // 8C
  "MOV:2|1:direct,Ri",         // 8D
  "MOV:2|1:direct,Ri",         // 8E
  "MOV:2|1:direct,Ri",         // 8F
  "MOV:3|DPTR,1:immed16",      // 90
  "ACALL:2|1:addr11",          // 91
  "MOV:2|1:bit,C",             // 92
  "MOVC:1|A,@A+DPTR",          // 93
  "SUBB:2|A,1:immed",          // 94
  "SUBB:2|A,1:direct",         // 95
  "SUBB:1|A,@Ri",              // 96
  "SUBB:1|A,@Ri",              // 97
  "SUBB:1|A,Ri",               // 98
  "SUBB:1|A,Ri",               // 99
  "SUBB:1|A,Ri",               // 9A
  "SUBB:1|A,Ri",               // 9B
  "SUBB:1|A,Ri",               // 9C
  "SUBB:1|A,Ri",               // 9D
  "SUBB:1|A,Ri",               // 9E
  "SUBB:1|A,Ri",               // 9F
  "ORL:2|C,1:nbit",            // A0
  "AJMP:2|1:addr11",           // A1
  "MOV:2|C,1:bit",             // A2
  "INC:1|DPTR",                // A3
  "MUL:1|AB",                  // A4
  "_A5_:1|",                   // A5
  "MOV:2|@Ri,1:direct",        // A6
  "MOV:2|@Ri,1:direct",        // A7
  "MOV:2|Ri,1:direct",         // A8
  "MOV:2|Ri,1:direct",         // A9
  "MOV:2|Ri,1:direct",         // AA
  "MOV:2|Ri,1:direct",         // AB
  "MOV:2|Ri,1:direct",         // AC
  "MOV:2|Ri,1:direct",         // AD
  "MOV:2|Ri,1:direct",         // AE
  "MOV:2|Ri,1:direct",         // AF
  "ANL:2|C,1:nbit",            // B0
  "ACALL:2|1:addr11",          // B1
  "CPL:2|1:bit",               // B2
  "CPL:1|C",                   // B3
  "CJNE:3|A,1:immed,2:rela",   // B4
  "CJNE:3|A,1:direct,2:rela",  // B5
  "CJNE:3|@Ri,1:immed,2:rela", // B6
  "CJNE:3|@Ri,1:immed,2:rela", // B7
  "CJNE:3|Ri,1:immed,2:rela",  // B8
  "CJNE:3|Ri,1:immed,2:rela",  // B9
  "CJNE:3|Ri,1:immed,2:rela",  // BA
  "CJNE:3|Ri,1:immed,2:rela",  // BB
  "CJNE:3|Ri,1:immed,2:rela",  // BC
  "CJNE:3|Ri,1:immed,2:rela",  // BD
  "CJNE:3|Ri,1:immed,2:rela",  // BE
  "CJNE:3|Ri,1:immed,2:rela",  // BF
  "PUSH:2|1:direct",           // C0
  "AJMP:2|1:addr11",           // C1
  "CLR:2|1:bit",               // C2
  "CLR:1|C",                   // C3
  "SWAP:1|A",                  // C4
  "XCH:2|A,1:direct",          // C5
  "XCH:1|A,@Ri",               // C6
  "XCH:1|A,@Ri",               // C7
  "XCH:1|A,Ri",                // C8
  "XCH:1|A,Ri",                // C9
  "XCH:1|A,Ri",                // CA
  "XCH:1|A,Ri",                // CB
  "XCH:1|A,Ri",                // CC
  "XCH:1|A,Ri",                // CD
  "XCH:1|A,Ri",                // CE
  "XCH:1|A,Ri",                // CF
  "POP:2|1:direct",            // D0
  "ACALL:2|1:addr11",          // D1
  "SETB:2|1:bit",              // D2
  "SETB:1|C",                  // D3
  "DA:1|A",                    // D4
  "DJNZ:3|1:direct,2:rela",    // D5
  "XCHD:1|A,@Ri",              // D6
  "XCHD:1|A,@Ri",              // D7
  "DJNZ:2|Ri,1:rela",          // D8
  "DJNZ:2|Ri,1:rela",          // D9
  "DJNZ:2|Ri,1:rela",          // DA
  "DJNZ:2|Ri,1:rela",          // DB
  "DJNZ:2|Ri,1:rela",          // DC
  "DJNZ:2|Ri,1:rela",          // DD
  "DJNZ:2|Ri,1:rela",          // DE
  "DJNZ:2|Ri,1:rela",          // DF
  "MOVX:1|A,@DPTR",            // E0
  "AJMP:2|1:addr11",           // E1
  "MOVX:1|A,@Ri",              // E2
  "MOVX:1|A,@Ri",              // E3
  "CLR:1|A",                   // E4
  "MOV:2|A,1:direct",          // E5
  "MOV:1|A,@Ri",               // E6
  "MOV:1|A,@Ri",               // E7
  "MOV:1|A,Ri",                // E8
  "MOV:1|A,Ri",                // E9
  "MOV:1|A,Ri",                // EA
  "MOV:1|A,Ri",                // EB
  "MOV:1|A,Ri",                // EC
  "MOV:1|A,Ri",                // ED
  "MOV:1|A,Ri",                // EE
  "MOV:1|A,Ri",                // EF
  "MOVX:1|@DPTR,A",            // F0
  "ACALL:2|1:addr11",          // F1
  "MOVX:1|@Ri,A",              // F2
  "MOVX:1|@Ri,A",              // F3
  "CPL:1|A",                   // F4
  "MOV:2|1:direct,A",          // F5
  "MOV:1|@Ri,A",               // F6
  "MOV:1|@Ri,A",               // F7
  "MOV:1|Ri,A",                // F8
  "MOV:1|Ri,A",                // F9
  "MOV:1|Ri,A",                // FA
  "MOV:1|Ri,A",                // FB
  "MOV:1|Ri,A",                // FC
  "MOV:1|Ri,A",                // FD
  "MOV:1|Ri,A",                // FE
  "MOV:1|Ri,A",                // FF
];


const handlers = {
  bit: x => 'bit',
  nbit: x => '/bit',
  immed: x => '#imm8',
  immed16: x => '#imm16',
  addr16: x => 'addr16',
  addr11: (x, op) => (op >>> 5).toString() + 'xx',
  verbatum: x => x,
  direct: x => 'dir',
  rela: x => 'rela',
  Ri: (x, op) => 'R' + (op & 7).toString(),
  '@Ri': (x, op) => '@R' + (op & 1).toString(),
};

const opcodeHandlers = {Ri: 'Ri', '@Ri': '@Ri'};

const operands = disOp
      .map((fmt, op) => {
        const [lh, rh] = fmt.split(/\|/);
        const [mnemonic, nBytes] = lh.split(/:/);
        //  "JBC:3|1:bit,2:rela",        // 10
        return mnemonic + ' ' + rh.split(/,/).map(opnd => {
          let [offset, opFmt] = opnd.split(/:/);
          console.log(`${toHex2(op)}: ${mnemonic}:${nBytes}  opFmt=${opFmt}, offset=${offset}`);
          opFmt = opFmt || opcodeHandlers[offset] || 'verbatum';
          return handlers[opFmt](offset, op);
        }).join(',')
      })
      .map(it => '"' + it.trim() + '"');


console.log(`

OPERANDS:

"",${_.range(16).map(x => '"_' + toHex1(x) + '"')}
${_.chunk(operands, 16).map((row, x) => ['"' + toHex1(x) + '_"', ...row].join(',')).join('\n')}
`);
