{
}

Start =
        __ p:Instruction+ __            { return p; }

Instruction =
        mnemonic:SYMBOL ':' transfers:Transfer+
                                        { return { 
                                            type: 'Instruction',
                                            mnemonic,
                                            transfers,
                                          };
                                        }
;

Transfer =
         target:Target '<--' e: expression
                                        { return {
                                            type: 'Transfer',
                                            target,
                                            e,
                                        }
;

Target =
       indirect:Indirection           { return indirect; }

Indirection =
        '(' e:Indirection ')'           { return {
                                            type: 'Indirection',
                                            e,
                                          };
                                        }
|       e:Variable                      { return e; }
;

Variable =
        var:SYMBOL field:BitField?      { return {
                                            type: 'Variable',
                                            var,
                                            field,
                                          };
                                        }
;

BitField =
        '<' h:INTEGER '-' l:INTEGER '>' { return {
                                            type: 'BitField',
                                            h,
                                            l,
                                          };
                                        }
;


INTEGER = digits:[0-9]+                 { return parseInt(digits); }

SYMBOL = s:( [a-zA-Z_] [a-zA-Z_0-9]* )  { return s; }
