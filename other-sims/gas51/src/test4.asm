; test file to test the gas51 assembler
;	cjne    r1,   #   2  3  12,23.ff
		
		
		;.org 823
		
		;mov a,#43
		mov B,0A
		
		inc r1
		inc r6
		inc r3

			mov a,#23
		inc tl0
		;mov a,0xe0
there:		mov 4,#15
;		mov tmod,#99
		inc a
		inc 32
		mov th0,tcon
;		acall var
;		ljmp var
;		lcall foo

		jnz there
;		inc a
		mov a,#12		



;.org 900	
;		inc a
;		mov 54,#12

;var:		inc a
		dec a

;foo:		mov 10,#23
		mov 34,46				

