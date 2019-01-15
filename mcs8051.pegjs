{
// NOTES:
// * If PC is not assigned in insn, PC = PC + number of bytes in insn by default

  function locToString(loc) {
    const endLine = loc.start.line !== loc.end.line ? `${loc.end.line}.` : '';
    return `${loc.start.line}.${loc.start.column}-${endLine}${loc.end.column}`;
  }

  function mk(type, props) {
    console.log(`${locToString(location())}: ${type}`, props);
    return Object.assign({type}, props);
  }

  const KEYWORDS = 'if then else endif'.split(/\s+/);
  function isKeyword(s) {
    return KEYWORDS.includes(s);
  }
}

////////////////////////////////////////////////////////////////

Start = p:Instruction 
        p2:( EOL p2:Instruction {return p2} )+
                                        { return p.concat(p2); }

Instruction = mnemonic:SYMBOL EQ b1:OpSpec
          bN:( b2:OpSpec b3:OpSpec? { return {b2, b3}; } )? COLON
          transfers:Transfer*           { return mk('Instruction', { 
                                            mnemonic,
                                            b1,
                                            b2: bN.b2 || null,
                                            b3: bN.b3 || null,
                                            transfers,
                                          }); }

Transfer = target:Target e:(ARROW e:Expression { return e; } )? EOL
                                        { return mk('Transfer', {
                                            target,
                                            e: e || null,
                                          }); }
/       IF e:Expression EOL? THEN EOL?
          thenPart:Transfer+
          elsePart:( ELSE et:Transfer+ {return et})? EOL?
          ENDIF
                                        { return mk('If', {
                                            e,
                                            thenPart,
                                            elsePart,
                                          });
                                        }

Target = e:Indirection                  { console.log('Target Indir', e); return e }
/       e:Code                          { console.log('Target Code', e); return e }

Indirection = LP e:Indirection RP       { return mk('Indirection', {e}); }
/       Var

Var = id:SYMBOL field:BitField?         { return mk('Var', {id, field}); }
/       NOT e:Var                       { return mk(type, {e}); }

BitField = LBIT h:INTEGER MINUS l:INTEGER RBIT
                                        { return mk('BitField', {h, l}); }

Expression = l:Term type:(
        ANDAND / OROR / 
        AND / OR / XOR /
        EQ / NE / LT / GT /
        PLUS / MINUS
    )
    r: Expression                       { return mk(type, {l, r}); }

Term =  INTEGER
/       Code
/       Var

Code = LBRACE code:$( !RBRACE .)* RBRACE
                                        { return mk('Code', {code}); }

OpSpec = sym:SYMBOL                     { return mk('Symbol', {sym}); }
/       WS '0' [bB] bits:$[A-Za-z_01]+  { return mk('Bits', {bits}); }
/       WS '0' [xX] d:$[a-fA-F0-9]+     { return parseInt(d, 16); }
/       WS d:$[a-fA-F0-9]+ [hH]         { return parseInt(d, 16); }

INTEGER = WS '0' [xX] d:$[a-fA-F0-9]+   { return parseInt(d, 16); }
/       WS '0' [bB] d:$[01]+            { return parseInt(d, 2); }
/       WS d:$[a-fA-F0-9]+ [hH]         { return parseInt(d, 16); }
/       WS d:$[0-9]+                    { return parseInt(d); }

SYMBOL = WS s:$( [a-zA-Z_] [a-zA-Z_0-9]* ) !{ isKeyword(s) }
                                        { return s; }

EOL = ( [\n\r\0B\x0C]                   // Line ending whitespace
  /   '//' (!'\n' .)*                   // // to end of line comments
     )

INLINE_WS = [ \t]                       // Whitespace within a line
  /   '/*' (!'*/' .)* '*/'              // /* */ comments

// Arbitrary whitespace
WS = ( INLINE_WS / EOL )*


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
OR =     WS $'|' ![|]
XOR =    WS $'^'
EQ =     WS $'='
NE =     WS $'!='
LT =     WS $'<' ![-]
GT =     WS $'>'
PLUS =   WS $'+'
MINUS =  WS $'-'
IF =     WS $'if'       ![a-z0-9_]i
THEN =   WS $'then'     ![a-z0-9_]i
ELSE =   WS $'else'     ![a-z0-9_]i
ENDIF =  WS $'endif'    ![a-z0-9_]i
