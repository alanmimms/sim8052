{
  // NOTES:
  // * If PC is not assigned in insn, PC = PC + number of bytes in insn by default
  const fs = require('fs');
  const util = require('util');
  const DEBLOG = util.debuglog('parse');

  function locToString(loc) {
    const endLine = loc.start.line !== loc.end.line ? `${loc.end.line}.` : '';
    return `${loc.start.line}.${loc.start.column}-${endLine}${loc.end.column}`;
  }

  function mk(type, props) {
    DEBLOG(`${locToString(location())}: ${type}`, util.inspect(props, {depth: 99}));
    return Object.assign({type}, props);
  }

  const KEYWORDS = 'if then else endif'.split(/\s+/);
  function isKeyword(s) {
    return KEYWORDS.includes(s);
  }
}

////////////////////////////////////////////////////////////////

Start = p:Instruction 
        pRest:( EOL p2:Instruction {return p2} )+
                                        {
                                          p = [p, ...pRest];

                                          const treeLog = util.inspect(p, {
                                            depth: 999,
                                            colors: false,
                                            maxArrayLength: 9999,
                                            breakLength: 100,
                                            compact: true,
                                          });

                                          DEBLOG(`Result tree:`, treeLog);

                                          fs.writeFileSync('ast.log', treeLog, {
                                            mode: 0o664,
                                          });

                                          return p }

Instruction = mnemonic:SYMBOL EQ b1:OpSpec
        bN:( b2:OpSpec b3:OpSpec? { return {b2, b3} } )? operands:Operands COLON
        transfers:Transfer*             { return mk('Instruction', { 
                                            mnemonic,
                                            operands,
                                            b1,
                                            b2: bN ? bN.b2 : null,
                                            b3: bN ? bN.b3 : null,
                                            transfers,
                                          }) }

Transfer = target:Target e:(ARROW e:Expression { return e } )? EOL
                                        { return mk('Transfer', {
                                            target,
                                            e: e || null,
                                          }) }
/       IF e:Expression EOL? THEN EOL
          thenPart:Transfer+
          elsePart:( ELSE EOL et:Transfer+ {return et})?
          ENDIF EOL                     { return mk('If', {
                                            e,
                                            thenPart,
                                            elsePart,
                                          });
                                        }

Target = e:Indirection                  { return e }
/       e:Code                          { return e }

Indirection = LP e:Indirection RP       { return mk('Indirection', {e}) }
/       Var

Var = id:SYMBOL field:BitField?         { return mk('Var', {id, field}) }
/       NOT e:Var                       { return mk('Not', {e}) }

BitField = LBIT h:INTEGER MINUS l:INTEGER RBIT
                                        { return mk('BitField', {h, l}) }

Expression =
    l:Term
    type:$(
        ANDAND  / OROR  / 
        AND     / OR    / XOR   /
        EQ      / NE    / LT    / GT    /
        PLUS    / MINUS
    )
    r:Expression                        { return mk(type, {l, r}) }
/   Term

Term =  INTEGER
/       Code
/       Var
/       Indirection

Code = LBRACE code:$( !RBRACE .)* RBRACE
                                        { return mk('Code', {code}) }

OpSpec = sym:SYMBOL                     { return mk('Symbol', {sym}) }
/       WS '0' [bB] bits:$[A-Za-z_01]+  { return mk('Bits', {bits}) }
/       WS '0' [xX] d:$[a-fA-F0-9]+     { return parseInt(d, 16) }
/       WS d:$[a-fA-F0-9]+ [hH]         { return parseInt(d, 16) }

Operands = WS '"' s:$(!'"' .)* '"'   { return s }

INTEGER = WS '0' [xX] d:$[a-fA-F0-9]+   { return parseInt(d, 16) }
/       WS '0' [bB] d:$[01]+            { return parseInt(d, 2) }
/       WS d:$[a-fA-F0-9]+ [hH]         { return parseInt(d, 16) }
/       WS d:$[0-9]+                    { return parseInt(d) }

SYMBOL = WS
         s:$( [a-zA-Z_] [a-zA-Z_0-9]* ) !{ return isKeyword(s) }
                                        { return s }

EOL = ( [\n\r\0B\x0C]                   // Line ending whitespace
      /   '//' (!'\n' .)* '\n'          // // to end of line comments
      )

INLINE_WS = [ \t]                       // Whitespace within a line
      /   '/*' (!'*/' .)* '*/'          // /* */ comments

WS = ( INLINE_WS / EOL )*               // Arbitrary whitespace

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
