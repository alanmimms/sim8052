; test file to test the gas51 assembler  ONLY...
;another line of comment...
#include<asm51.h>

start: mov a,#32
       mov p0,#14
       mov a,b
       ;mov p1,#12		

loop:	add a,#32
	inc a
	dec b
	jnz loop


#include<asm51.h>




;#include<asm51.h>
