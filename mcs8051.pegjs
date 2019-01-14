{
// NOTES:
// * If PC is not assigned in insn, PC = PC + number of bytes in insn by default
}

Start =
        p:Instruction+                  { return p; }

Instruction =
        mnemonic:SYMBOL b1:OpSpec ( b2:OpSpec b3:OpSpec? )? COLON transfers:Transfer*
                                        { return { 
                                            type: 'Instruction',
                                            mnemonic,
                                            b1,
                                            b2: b2 || null,
                                            b3: b3 || null,
                                            transfers,
                                          }; }

Transfer =
         target:Target (ARROW e:Expression)?
                                        { return {
                                            type: 'Transfer',
                                            target,
                                            e: e || null,
                                          }; }
/       IF e:Expression THEN ifPart:Transfer+ ( ELSE et:Transfer+ )? ENDIF
                                        { return {
                                            type: 'If',
                                            e,
                                            ifPart,
                                            elsePart: et || null,
                                          };
                                        }

Target =
        indirect:Indirection             { return indirect; }
/       Code

Indirection =
        LP e:Indirection RP             { return {type: 'Indirection', e}; }
/       e:Variable                      { return e; }

Variable =
        id:SYMBOL field:BitField?       { return {type: 'Variable', id, field}; }
/       NOT e:Variable                  { return {type: 'Not', e}; }

BitField =
        LBIT h:INTEGER MINUS l:INTEGER RBIT
                                        { return {type: 'BitField', h, l}; }

Expression = e:Term type:(
        ANDAND / OROR / 
        AND / OR / XOR /
        EQ / NE / LT / GT /
        PLUS / MINUS
    )                                   { return {type, e}; }

Term =
        INTEGER
/       Code
/       Variable

Code =
        LBRACE code:( !RBRACE .)* RBRACE { return {type: 'Code', code}; }

OpSpec =
        sym:SYMBOL                      { return {type: 'Symbol', sym}; }
/       WS '0' [bB] bits:( [A-Za-z_01]+ )
                                        { return {type: 'Bits', bits}; }
/       WS '0' [xX] digits:[a-fA-F0-9]+ { return parseInt(digits, 16); }
/       WS digits:[a-fA-F0-9]+ [hH]     { return parseInt(digits, 16); }

INTEGER =
        WS digits:[0-9]+                { return parseInt(digits); }
/       WS '0' [xX] digits:[a-fA-F0-9]+ { return parseInt(digits, 16); }
/       WS '0' [bB] digits:[01]+        { return parseInt(digits, 2); }
/       WS digits:[a-fA-F0-9]+ [hH]     { return parseInt(digits, 16); }

SYMBOL = s:( [a-zA-Z_] [a-zA-Z_0-9]* )  { return s; }

WS = ( [ \n\r\t\x0B\x0C]                // Normal whitespace character set
  /   '/*' (!'*/' .)* '*/'              // /* */ comments
  /   '//' (!'\n' .)*                   // // to end of line comments
     )*


COLON =  WS $':'
LP =     WS $'('
RP =     WS $')'
ARROW =  WS $'<-'
LBIT =   WS $'['
RBIT =   WS $']'
LBRACE = WS $'{'
RBRACE = WS $'}'
ANDAND = WS $'&&'
OROR =   WS $'||'
NOT =    WS $'~'
AND =    WS $'&'
OR =     WS $'|'
XOR =    WS $'^'
EQ =     WS $'='
NE =     WS $'!='
LT =     WS $'<'
GT =     WS $'>'
PLUS =   WS $'+'
MINUS =  WS $'-'
IF =     WS $'if'
THEN =   WS $'then'
ELSE =   WS $'else'
ENDIF =  WS $'endif'
