{
// NOTES:
// * If PC is not assigned in insn, PC = PC + number of bytes in insn by default
}

Start = p:Instruction 
        p2:( ParagraphDelimiter p2:Instruction {return p2} )+
                                        { return p.concat(p2); }

Instruction =
        mnemonic:SYMBOL EQ b1:OpSpec
          bN:( b2:OpSpec b3:OpSpec? { return {b2, b3}; } )? COLON
          transfers:Transfer*
          ParagraphDelimiter            { return { 
                                            type: 'Instruction',
                                            mnemonic,
                                            b1,
                                            b2: bN.b2 || null,
                                            b3: bN.b3 || null,
                                            transfers,
                                          }; }

Transfer =
         target:Target e:(ARROW e:Expression { return e; } )?
                                        { return {
                                            type: 'Transfer',
                                            target,
                                            e: e || null,
                                          }; }
/       IF e:Expression THEN
          thenPart:Transfer+
          elsePart:( ELSE et:Transfer+ {return et})?
          ENDIF
                                        { return {
                                            type: 'If',
                                            e,
                                            thenPart,
                                            elsePart,
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
        LBRACE code:$( !RBRACE .)* RBRACE
                                        { return {type: 'Code', code}; }

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

SYMBOL = WS s:( [a-zA-Z_] [a-zA-Z_0-9]* )  { return s; }

LWS = ( [\n\r\0B\x0C]                   // Line ending whitespace
  /   '//' (!'\n' .)*                   // // to end of line comments
     )

INLINE_WS = [ \t]                       // Whitespace within a line
  /   '/*' (!'*/' .)* '*/'              // /* */ comments

// Arbitrary whitespace
WS = ( INLINE_WS / LWS )*


ParagraphDelimiter = INLINE_WS* LWS INLINE_WS* LWS

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
