LF EQU 0Ah
CR EQU 0DH
ESC EQU 1Bh
StartChar EQU ':'
Slash EQU '/'
Skip EQU 13

Ch DATA 0Fh
State DATA 10h
DataByte DATA 11h
ByteCount DATA 12h
HighAddr DATA 13h
LowAddr DATA 14h
RecType DATA 15h
ChkSum DATA 16h
HASave DATA 17h
LASave DATA 18h
FilChkHi DATA 19h
FilChkLo DATA 1Ah

Flags DATA 20h
HexFlag BIT Flags.0
EndFlag BIT Flags.1
DoneFlag BIT Flags.2

EFlags DATA 21h
ErrFlag1 BIT EFlags.0
ErrFlag2 BIT EFlags.1
ErrFlag3 BIT EFlags.2
ErrFlag4 BIT EFlags.3
ErrFlag5 BIT EFlags.4
ErrFlag6 BIT EFlags.5
DatSkipFlag BIT Flags.3

ExInt0 EQU 02003h
T0Int EQU 0200Bh
ExInt1 EQU 02013h
T1Int EQU 0201Bh
SerInt EQU 02023h
T2Int EQU 0202Bh

ORG 0000h
LJMP Start

ORG 0003h
 LJMP ExInt0
RETI

ORG 000Bh
 LJMP T0Int
RETI

ORG 0013h
 LJMP ExInt1
RETI

ORG 001Bh
 LJMP T1Int
RETI

ORG 0023h
 LJMP SerInt
RETI

ORG 002Bh
 LJMP T2Int
RETI

ORG 0003Dh
ErrLoop: MOV A,#'?'
 ACALL PutChar
 ACALL GetChar
 SJMP ErrLoop

HexOK: MOV EFlags,#0
 ACALL GetChar
 CJNE A,#Slash,HexOK
 
 ACALL GetByte
 JB ErrFlag1,HexOK
 MOV HighAddr,DataByte
 
 ACALL GetByte
 JB ErrFlag1,HexOK
 MOV LowAddr,DataByte
 
 ACALL GetChar
 CJNE A,#CR,HexOK

 MOV A,#'@'
 ACALL PutChar
 JNB TI,$
 PUSH LowAddr
 PUSH HighAddr
 RET

HexIn: CLR A
 MOV State,A
 MOV Flags,A
 MOV HighAddr,A
 MOV LowAddr,A
 MOV HASave,A
 MOV LASave,A
 MOV ChkSum,A
 MOV FilChkHi,A
 MOV FilChkLo,A
 MOV Eflags,A
 SETB ErrFlag4

StateLoop: ACALL GetChar
 ACALL AscHex
 MOV Ch,A
 ACALL GoState
 JNB DoneFlag,StateLoop
 
 ACALL PutChar
 MOV A,#'('
 ACALL PutChar
 MOV A,FilChkHi
 ACALL PrByte
 MOV A,FilChkLo
 ACALL PrByte
 MOV A,#')'
 ACALL PutChar
 ACALL CRLF
 RET

GoState: MOV A,State
 ANL A,#0Fh
 RL  A
 MOV DPTR,#StateTable
 JMP @A+DPTR

StateTable: AJMP StWait
 AJMP StLeft
 AJMP StGetCnt
 AJMP StLeft
 AJMP StGetAd1
 AJMP StLeft
 AJMP StGetAd2
 AJMP StLeft
 AJMP StGetRec
 AJMP StLeft
 AJMP StGetDat
 AJMP StLeft
 AJMP StGetChk
 AJMP StSkip
 AJMP BadState
 AJMP BadState

StWait: MOV A,Ch
 CJNE A,#StartChar,SWEX
 INC State
SWEX: RET

StLeft: MOV A,Ch
 JNB HexFlag,SLERR
 ANL A,#0Fh
 SWAP A
 MOV DataByte,A
 INC State
 RET

SLERR: SETB ErrFlag1
 SETB DoneFlag
 RET

StRight: MOV A,Ch
 JNB HexFlag,SRERR
 ANL A,#0Fh
 ORL A,DataByte
 MOV DataByte,A
 ADD A,ChkSum
 MOV ChkSum,A
 RET

SRERR: SETB ErrFlag1
 SETB DoneFlag
 RET

StGetCnt: ACALL StRight
 MOV A,DataByte
 MOV ByteCount,A
 INC State
 RET

StGetAd1: ACALL StRight
 MOV A,DataByte
 MOV HighAddr,A
 INC State
 RET

StGetAd2: ACALL STRight
 MOV A,DataByte
 MOV LowAddr,A
 INC State
 RET

StGetRec: ACALL StRight
 MOV A,DataByte
 MOV RecType,A
 JZ SGRDat
 CJNE A,#1,SGRErr
 SETB EndFlag
 SETB DatSkipFlag
 MOV State,#11
 SJMP SGREX
SGRDat: INC State
SGREX: RET

SGRErr: SETB ErrFlag2
 SETB DoneFlag
 RET

StGetDat: ACALL StRight
 JB DatSkipFlag,SGD1

 ACALL Store

 MOV A,DataByte
 ADD A,FilChkLo
 MOV FilChkLo,A
 CLR A
 ADDC A,FilChkHi
 MOV FilChkHi,A
 MOV A,DataByte
SGD1: DJNZ ByteCount,SGDEX
 INC State
 SJMP SGDEX2

SGDEX: DEC State
SGDEX2: RET

StGetChk: ACALL StRight
 JNB EndFlag,SGC1
 SETB DoneFlag
 SJMP SGCEX

SGC1: MOV A,ChkSum
 JNZ SGCErr
 MOV ChkSum,#0
 MOV State,#0
 MOV LASave,LowAddr
 MOV HASave,HighAddr
SGCEX: RET

SGCErr: SETB ErrFlag3
 SETB DoneFlag
 RET

StSkip: RET

BadState: MOV State,#Skip
 RET

Store: MOV DPH,HighAddr
 MOV DPL,LowAddr
 MOV A,DataByte
 MOVX @DPTR,A

 MOVX A,@DPTR
 CJNE A,DataByte,StoreErr

 CLR ErrFlag4
 INC DPTR
 MOV HighAddr, DPH
 MOV LowAddr, DPL
 CLR A
 CJNE A,HighAddr,StoreEx
 CJNE A,LowAddr,StoreEx
 SETB ErrFlag5
StoreEx: RET

StoreErr: SETB ErrFlag6
 SETB DoneFlag
 RET

SerStart: MOV A,PCON  ; 1k2
 SETB ACC.7     
 MOV PCON,A
 MOV TH1,#0E5h  
 MOV TL1,#0E5h  
 MOV TMOD,#20h
 MOV TCON,#40h
 MOV SCON,#52h
 RET

GetByte: ACALL GetChar
 ACALL AscHex
 MOV Ch,A
 ACALL StLeft
 ACALL GetChar
 ACALL AscHex
 MOV Ch,A
 ACALL StRight
 RET

GetChar: JNB RI,$
 CLR RI
 MOV A,SBUF
 CJNE A,#ESC,GCEX
 LJMP Start
GCEX: RET

PutChar: JNB TI,$
 CLR TI
 MOV SBUF,A
 RET

AscHex: CJNE A,#'0',AH1
AH1: JC AHBad
 CJNE A,#'9'+1,AH2
AH2: JC AHVal09

 CJNE A,#'A',AH3
AH3: JC AHBad
 CJNE A,#'F'+1,AH4
AH4: JC AHValAF

 CJNE A,#'a',AH5
AH5: JC AHBad
 CJNE A,#'f'+1,AH6
AH6: JNC AHBad
 CLR C
 SUBB A,#27h
 SJMP AHVal09

AHBad: CLR HexFlag
 SJMP AHEX
AHValAF: CLR C
 SUBB A,#7
AHVal09: CLR C
 SUBB A,#'0'
 SETB HexFlag
AHEX: RET

HexAsc: ANL A,#0Fh

 CJNE A,#0Ah,HA1
HA1: JC HAVal09
 ADD A,#7
HAVal09: ADD A,#'0'
 RET

ErrPrt: MOV A,#':'
 CALL PutChar
 MOV A,Eflags
 JZ ErrPrtEx
 CALL PrByte
ErrPrtEx: RET

CRLF: MOV A,#CR
 CALL PutChar
 MOV A,#LF
 CALL PutChar
 RET

PrByte: PUSH ACC
 SWAP A
 CALL HexAsc
 CALL PutChar
 POP ACC
 CALL HexAsc
 CALL PutChar
 RET

ORG 00250h
Start: MOV IE,#0
 MOV SP,#5Fh
 ACALL SerStart
 ACALL CRLF
 MOV A,#'='
 ACALL PutChar
 ACALL HexIn

 ACALL ErrPrt

 MOV A,EFlags
 JZ LongOK
 LJMP ErrLoop
 LongOK: LJMP HexOK

END