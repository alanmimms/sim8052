{

  // This is used with pegjs parser generator to build 8052-insn.js,
  // which is the guts of the instruction simulation used by sim.js.
  // First pegjs generates the parser 8052.js. Then this is run to
  // create the 8052-insn.js source. All of this is shown in
  // package.json as the "build" script.

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

Instruction = mnemonic:SYMBOL EQ b1:OperandSpec
        bN:( b2:OperandSpec b3:OperandSpec?
                                        { return {b2, b3} } )? operands:Operands COLON EOL
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
                                            e,
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

Target = VarOrAt
 /       Code

VarOrAt = space:SYMBOL SLASH addr:VarOrAt
                                        { return mk('Slash', {space, addr}) }
/       Var

Var = id:SYMBOL field:BitField?         { return mk('Var', {id, field}) }
/       NOT e:Var                       { return mk('Not', {e}) }

BitField = DOT field:SYMBOL             { return field }

Expression =
    l:Term
    type:(
        ANDAND  / OROR  / 
        AND     / OR    / XOR   /
        EQ      / NE    / LT    / GT    /
        PLUS    / MINUS
    )
    r:Expression                        { return mk(type, {l, r}) }
/   Term

Term =  INTEGER
/       VarOrAt
/       Code

Code = LBRACE code:$( !RBRACE .)* RBRACE
                                        { return mk('Code', {code}) }

OperandSpec = sym:SYMBOL                { return mk('SYMBOL', {sym}) }
/       WS '0' [bB] bits:$[A-Za-z_01]+  { return mk('Bits', {bits}) }
/       WS '0' [xX] d:$[a-fA-F0-9]+     { return parseInt(d, 16) }
/       WS d:$[a-fA-F0-9]+ [hH]         { return parseInt(d, 16) }

Operands = WS '"' s:$(!'"' .)* '"'   { return s }

INTEGER = WS '0' [xX] d:$[a-fA-F0-9]+   { return parseInt(d, 16) }
/       WS '0' [bB] d:$[01]+            { return parseInt(d, 2) }
/       WS d:$[a-fA-F0-9]+ [hH]         { return parseInt(d, 16) }
/       WS d:$[0-9]+                    { return parseInt(d) }

SYMBOL = WS s:$( [a-zA-Z_] [a-zA-Z_0-9]* )
         !{ return isKeyword(s) }
                                        { return s }

EOL = WS (
     [\n\r\0B\x0C]                      // Line ending whitespace
  /  '//' (!'\n' .)* '\n'               // "//" to end of line comments
  )

WS = '/*' (!'*/' .)* '*/'               // /* */ comments
  /  [ \t]*                             // Whitespace within a line

COLON =  WS ':'         {return 'COLON'}
SLASH =  WS '/'         {return 'SLASH'}
ARROW =  WS '<-'        {return 'ARROW'}
DOT  =   WS '.'         {return 'DOT'}
LBRACE = WS '{'         {return 'LBRACE'}
RBRACE = WS '}'         {return 'RBRACE'}
ANDAND = WS '&&'        {return 'ANDAND'}
OROR =   WS '||'        {return 'OROR'}
NOT =    WS '~'         {return 'NOT'}
AND =    WS '&'         {return 'AND'}
OR =     WS '|' ![|]    {return 'OR'}
XOR =    WS '^'         {return 'XOR'}
EQ =     WS '='         {return 'EQ'}
NE =     WS '!='        {return 'NE'}
LT =     WS '<' ![-]    {return 'LT'}
GT =     WS '>'         {return 'GT'}
PLUS =   WS '+'         {return 'PLUS'}
MINUS =  WS '-'         {return 'MINUS'}
IF =     WS $'if'       ![a-z0-9_]i
THEN =   WS $'then'     ![a-z0-9_]i
ELSE =   WS $'else'     ![a-z0-9_]i
ENDIF =  WS $'endif'    ![a-z0-9_]i
