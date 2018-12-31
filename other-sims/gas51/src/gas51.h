/*****INCLUDING THIS FILE WITH '#include' INCLUDES THE 'extern' DECLARATIONS FOR GLOBAL VARIABLES -THOSE VARIABLES CONTAINED********/
					/***** IN THE FILE 'error.c'*******/


#include<stdio.h>
#include<stdlib.h>
#include<unistd.h>
#include<string.h>

extern FILE * preprocess(char *);
extern const char *gas51_errlist[] ;
extern char gas51_errno ;
extern char gas51_file_being_assembled[20] ;
extern unsigned int gas51_line_no ;
extern unsigned int gas51_no_of_slashes ;

struct gas51_symtab 
			{
				char Symbol[20];
				unsigned int Address;
			}   ;



extern struct gas51_symtab gas51_symbol_table[100]; 

//extern struct gas51_symtab gas51_symbol_table_default[20];


/* file info stack declarations...*/
struct gas51_file_info 
			{
				char file[20];
				unsigned int file_line_no;
			};


extern struct gas51_file_info gas51_file_info_stack[10];
extern unsigned int gas51_stack_index ;  







