/*****************ALL GLOBAL VARIABLE DECLARATIONS GO INTO THIS FILE......***********************************/
/********THE CORRESPONDING 'extern' DECLARATIONS ARE IN 'gas51.h' , WHICH MAY BE INCLUDED WITH THE '#include' DIRECTIVE IN THE ACTUAL*****/
					/*********** C SOURCE FILE...........*/



/*  all error handling variables here...i.e. all assembler messages are generated from this file...*/
/*                      NAMING CONVENTION OF GLOBAL VARIABLES -> ALL ARE PREPENDED WITH 'gas51_'*/



#include"gas51.h"  // VERY IMPORTANT...LEARNED THIS FROM THE USENET C-FAQ  ;)
//unsigned char gas51_errno ;

const char  *gas51_errlist[]={ "File not  found. ",
			  "Parse error.",
			  "Illegal Operand.",
			  "Jump out of range.",
		          "Illegal Instruction.",
			  "Extra tokens in instruction.",
			  "Incompletely formed instruction." 
			 } ;   // requires revision in error code 6 statement...


unsigned int gas51_stack_index=0 ;


char gas51_errno = 0;





char gas51_file_being_assembled[20]="";

unsigned int gas51_line_no=0;  

unsigned int gas51_no_of_slashes=0;



//struct gas51_symtab gas51_symbol_table[100];


struct gas51_symtab gas51_symbol_table[100] ;/*= {
	 					{"A",0xE0},
						{"B",0xf0}
};
						
*/

struct gas51_file_info gas51_file_info_stack[10];







