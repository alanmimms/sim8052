# Decimal printing

* Numbers < 128 print normally
  * But 128=80, 129=81, ...
* Numbers >= 200 and < 256 print normally
* Adding ten to a number outputs ten more even when it's wrong
  * E.g., 170=10, 180=20
* 10 and 31 display normally, but 32=20
* 64=40
* 70-79=46-55, but 80=80 and 90=90, 100=100, 120=120
* 15=15, but 17-19=11-13, and then 20=20


# tb51intl/TB51.LST

The PRNTOS algorithm works by taking each bit in the 16-bit number on
TOS and adding it into an accumulator using ADDC to double the
accumulator's previous content. This yields a result and set of flags
suitable for Decimal Adjust instruction to turn it into a BCD digit
pair in ACC. At the end of 16 iterations (one for each bit), five
digits have been gathered and are displayed as BCD nybbles.


## PRNTOS decimal algorithm

    function PRNTOS(unsigned short tos):
        unsigned char tmp0 = 0      // Holds 10s,1s digits
        unsigned char tmpa = 0      // Holds 1000s,100s digits
        //
        for 16 iterations:
            tos = rlc(tos)
            tmp0 = decimaladjust(tmp0 + tmp0 + carry)
            tmpa = decimaladjust(tmpa + tmpa + carry)
        //
        tos.h = tmpa                // Get 1000s,100s digits
        tmpa = rlc(tos.l)           // Get 10000s digit
        tos.l = tmp0                // Get 10s,1s digits
        nibout(tmpa)                // 10000s digit
        nibout(tos.h >>> 4)         //  1000s digit
        nibout(tos.h)               //   100s digit
        nibout(tos.l >>> 4)         //    10s digit
        nibout(tos.l)               //     1s digit
```
0675 D248           1915     PRNTOS: SETB    ZERSUP          ;Set zero suppression flag.
0677 E4             1916             CLR     A
0678 F508           1917             MOV     TMP0,A
067A 7D10           1918             MOV     LP_CNT,#16      ;Conversion precision.
067C 20441D         1919             JB      HEXMOD,PRNHEX
067F 304A03         1920             JNB     SGN_FLG,PRN_1   ;Skip ahead if positive number.
0682 11EB           1921             CALL    STROUT          ;Output minus sign if negative.
0684 AD             1922             DB      '-' OR 80H
0685 CE             1923     PRN_1:    XCH     A,TOS_L
0686 33             1924                 RLC   A
0687 CE             1925               XCH     A,TOS_L

0688 CF             1926               XCH     A,TOS_H
0689 33             1927                 RLC   A
068A CF             1928               XCH     A,TOS_H

068B C508           1929               XCH     A,TMP0
068D 35E0           1930                 ADDC  A,ACC
068F D4             1931                 DA    A
0690 C508           1932               XCH     A,TMP0

0692 35E0           1933               ADDC    A,ACC
0694 D4             1934               DA      A
0695 DDEE           1935             DJNZ    LP_CNT,PRN_1

0697 FF             1936             MOV     TOS_H,A
0698 EE             1937             MOV     A,TOS_L
0699 33             1938             RLC     A
069A AE08           1939             MOV     TOS_L,TMP0
069C 11CC           1940     PRNHEX: CALL    NIBOUT
069E EF             1941             MOV     A,TOS_H
069F C4             1942             SWAP    A
06A0 11CC           1943             CALL    NIBOUT          ;Print second digit.
06A2 EF             1944             MOV     A,TOS_H
06A3 11CC           1945             CALL    NIBOUT          ;Print third digit.
06A5 304402         1946             JNB     HEXMOD,PRNH_1
06A8 C248           1947             CLR     ZERSUP          ;Print out last two chars. (at least) in hex.
06AA EE             1948     PRNH_1: MOV     A,TOS_L         ;Read into Acc.
06AB C4             1949             SWAP    A               ;Interchange nibbles.
06AC 11CC           1950             CALL    NIBOUT          ;Print fourth digit.
06AE C248           1951             CLR     ZERSUP
06B0 EE             1952             MOV     A,TOS_L         ;Reload byte.
06B1 11CC           1953             CALL    NIBOUT          ;Print last digit.
06B3 304403         1954             JNB     HEXMOD,PRNRET
06B6 11EB           1955             CALL    STROUT          ;Print trailing "H".
06B8 C8             1956             DB      'H' OR 80H
06B9 22             1957     PRNRET: RET
```
