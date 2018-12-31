
//#ifndef _PASS1_
//#define _PASS1_
//#endif

#include"gas51.h"

/* gas51_symbol_table[100]  = {
 				 {"A",0xe0},
				 {"B",0xf0}
	
	                    };    */
	

struct instruct
 {
   int hex_code;
   const char *mnemonic;
   int nobytes;
  // int clock;
   //int noperands;
  // void (*ins_ptr)(int);
};

   //struct instruct instructions;
  struct instruct instructions[]={
					   {0X0,"NOP",1},   //
					   {0X1,"AJMP ADDR",2},
					   {0X2,"LJMP ADDR",3}, //
					   {0X3,"RR A",1}, //
					   {0X4,"INC A",1},//
/*'X' denotes dummy args. for simulator*/  {0X5,"INC ADDR",2},//
 /*A means address,*/			   {0X6,"INC @R0",1},//
 /*D means data*/			   {0X7,"INC @R1",1},//
 /*C means code*/			   {0X8,"INC R0",1}, //
					   {0X9,"INC R1",1}, //
					   {0XA,"INC R2",1},//
					   {0XB,"INC R3",1}, //
					   {0XC,"INC R4",1}, //
					   {0XD,"INC R5",1},  //
					   {0XE,"INC R6",1},//
					   {0XF,"INC R7",1}, //
					   {0X10,"JBC ADDR,ADDR",3},
					   {0X11,"ACALL ADDR",2},
					   {0X12,"LCALL ADDR",3},
					   {0X13,"RRC A",1},  //
					   {0X14,"DEC A",1}, //
					   {0X15,"DEC ADDR",2},    //
					   {0X16,"DEC @R0",1},   //
					   {0X17,"DEC @R1",1},  //
					   {0X18,"DEC R0",1}, //
					   {0X19,"DEC R1",1}, //
					   {0X1A,"DEC R2",1}, //
					   {0X1B,"DEC R3",1}, //
					   {0X1C,"DEC R4",1}, //
					   {0X1D,"DEC R5",1}, //
					   {0X1E,"DEC R6",1}, //
					   {0X1F,"DEC R7",1}, //
					   {0X20,"JB ADDR,ADDR",3},
					   {0X21,"AJMP ADDR",2},
					   {0X22,"RET",1},
					   {0X23,"RL A",1}, //
					   {0X24,"ADD A,#DATA",2}, //
					   {0X25,"ADD A,ADDR",2}, //
					   {0X26,"ADD A,@R0 ",1}, //
					   {0X27,"ADD A,@R1 ",1}, //
					   {0X28,"ADD A,R0",1}, //
					   {0X29,"ADD A,R1",1},//
					   {0X2A,"ADD A,R2",1}, //
					   {0X2B,"ADD A,R3",1},//
					   {0X2C,"ADD A,R4",1}, //
					   {0X2D,"ADD A,R5",1}, //
					   {0X2E,"ADD A,R6",1}, //
					   {0X2F,"ADD A,R7",1}, //
					   {0X30,"JNB ADDR,ADDR",3},
					   {0X31,"ACALL ADDR",2},
					   {0X32,"RETI",1},
					   {0X33,"RLC A",1},
					   {0X34,"ADDC A,#DATA",2},
					   {0X35,"ADDC A,ADDR",2},
					   {0X36,"ADDC A,@R0 ",1},
					   {0X37,"ADDC A,@R1 ",1},
					   {0X38,"ADDC A,R0",1},
					   {0X39,"ADDC A,R1",1},
					   {0X3A,"ADDC A,R2",1},
					   {0X3B,"ADDC A,R3",1},
					   {0X3C,"ADDC A,R4",1},
					   {0X3D,"ADDC A,R5",1},
					   {0X3E,"ADDC A,R6",1},
					   {0X3F,"ADDC A,R7",1},
					   {0X40,"JC ADDR,ADDR",2},
					   {0X41,"AJMP ADDR",2},
					   {0X42,"ORL ADDR,A",2},
					   {0X43,"ORL ADDR,#DATA",3},
					   {0X44,"ORL A,#DATA",2},
					   {0X45,"ORL A,ADDR",2},
					   {0X46,"ORL A,@R0 ",1},
					   {0X47,"ORL A,@R1 ",1},
					   {0X48,"ORL A,R0",1},
					   {0X49,"ORL A,R1",1},
					   {0X4A,"ORL A,R2",1},
					   {0X4B,"ORL A,R3",1},
					   {0X4C,"ORL A,R4",1},
					   {0X4D,"ORL A,R5",1},
					   {0X4E,"ORL A,R6",1},
					   {0X4F,"ORL A,R7",1},
					   {0X50,"JNC ADDR,ADDR",2},
					   {0X51,"ACALL ADDR",2},
					   {0X52,"ANL ADDR,A",2},
					   {0X53,"ANL ADDR,#DATA",3},
					   {0X54,"ANL A,#DATA",2},
					   {0X55,"ANL A,ADDR",2},
					   {0X56,"ANL A,@R0  ",1},
					   {0X57,"ANL A,@R1  ",1},
					   {0X58,"ANL A,R0",1},
					   {0X59,"ANL A,R1",1},
					   {0X5A,"ANL A,R2",1},
					   {0X5B,"ANL A,R3",1},
					   {0X5C,"ANL A,R4",1},
					   {0X5D,"ANL A,R5",1},
					   {0X5E,"ANL A,R6",1},
					   {0X5F,"ANL A,R7",1},
					   {0X60,"JZ ADDR",2},
					   {0X61,"AJMP ADDR",2},
					   {0X62,"XRL ADDR,A",2},
					   {0X63,"XRL ADDR,#DATA",3},
					   {0X64,"XRL A,#DATA",2},
					   {0X65,"XRL A,ADDR",2},
					   {0X66,"XRL A,@R0",1},
					   {0X67,"XRL A,@R1",1},
					   {0X68,"XRL A,R0",1},
					   {0X69,"XRL A,R1",1},
					   {0X6A,"XRL A,R2",1},
					   {0X6B,"XRL A,R3",1},
					   {0X6C,"XRL A,R4",1},
					   {0X6D,"XRL A,R5",1},
					   {0X6E,"XRL A,R6",1},
					   {0X6F,"XRL A,R7",1},
					   {0X70,"JNZ ADDR",2},
					   {0X71,"ACALL ADDR",2},
					   {0X72,"ORL C,ADDR",2},
					   {0X73,"JMP @A+DPTR",1},
					   {0X74,"MOV A,#DATA",2},
  /*MOV DATAADDR,#DATA*/		   {0X75,"MOV ADDR,#DATA",3},
					   {0X76,"MOV @R0,#DATA",2},
					   {0X77,"MOV @R1,#DATA",2},
					   {0X78,"MOV R0,#DATA",2},
					   {0X79,"MOV R1,#DATA",2},
					   {0X7A,"MOV R2,#DATA",2},
					   {0X7B,"MOV R3,#DATA",2},
					   {0X7C,"MOV R4,#DATA",2},
					   {0X7D,"MOV R5,#DATA",2},
					   {0X7E,"MOV R6,#DATA",2},
					   {0X7F,"MOV R7,#DATA",2},
					   {0X80,"SJMP ADDR",2},
					   {0X81,"AJMP ADDR",2},
					   {0X82,"ANL C,ADDR",2},
					   {0X83,"MOVC A,@A+PC ",1},
					   {0X84,"DIV AB",1},
					   {0X85,"MOV ADDR,ADDR",3},
					   {0X86,"MOV ADDR,@R0",2},
					   {0X87,"MOV ADDR,@R1",2},
					   {0X88,"MOV ADDR,R0",2},
					   {0X89,"MOV ADDR,R1",2},
					   {0X8A,"MOV ADDR,R2",2},
					   {0X8B,"MOV ADDR,R3",2},
					   {0X8C,"MOV ADDR,R4",2},
					   {0X8D,"MOV ADDR,R5",2},
					   {0X8E,"MOV ADDR,R6",2},
					   {0X8F,"MOV ADDR,R7",2},
					   {0X90,"MOV DPTR,#DATA",3},
					   {0X91,"ACALL ADDR",2},
					   {0X92,"MOV ADDR,C",2},
					   {0X93,"MOVC A,@A+DPTR",1},
					   {0X94,"SUBB A,#DATA",2},
					   {0X95,"SUBB A,ADDR",2},
					   {0X96,"SUBB A,@R0 ",1},
					   {0X97,"SUBB A,@R1 ",1},
					   {0X98,"SUBB A,R0",1},
					   {0X99,"SUBB A,R1",1},
					   {0X9A,"SUBB A,R2",1},
					   {0X9B,"SUBB A,R3",1},
					   {0X9C,"SUBB A,R4",1},
					   {0X9D,"SUBB A,R5",1},
					   {0X9E,"SUBB A,R6",1},
					   {0X9F,"SUBB A,R7",1},
					   {0XA0,"ORL C,/ADDR",2},
					   {0XA1,"AJMP ADDR",2},
					   {0XA2,"MOV C,ADDR",2},
					   {0XA3,"INC DPTR",1},
					   {0XA4,"MUL AB",1},
					   {0XA5," ",0},          // no instruction for this opcode...nobytes changed to 0..necessary...
					   {0XA6,"MOV @R0,ADDR",2},
					   {0XA7,"MOV @R1,ADDR",2},
					   {0XA8,"MOV R0,ADDR",2},
					   {0XA9,"MOV R1,ADDR",2},
					   {0XAA,"MOV R2,ADDR",2},
					   {0XAB,"MOV R3,ADDR",2},
					   {0XAC,"MOV R4,ADDR",2},
					   {0XAD,"MOV R5,ADDR",2},
					   {0XAE,"MOV R6,ADDR",2},
					   {0XAF,"MOV R7,ADDR",2},
					   {0XB0,"ANL C,/ADDR",2},
					   {0XB1,"ACALL ADDR",2},
					   {0XB2,"CPL ADDR",2},
					   {0XB3,"CPL C",1},
					   {0XB4,"CJNE A,#DATA,ADDR",3},
					   {0XB5,"CJNE A,ADDR,ADDR",3},
					   {0XB6,"CJNE @R0,#DATA,ADDR",3},
					   {0XB7,"CJNE @R1,#DATA,ADDR",3},
					   {0XB8,"CJNE R0,#DATA,ADDR",3},
					   {0XB9,"CJNE R1,#DATA,ADDR",3},
					   {0XBA,"CJNE R2,#DATA,ADDR",3},
					   {0XBB,"CJNE R3,#DATA,ADDR",3},
					   {0XBC,"CJNE R4,#DATA,ADDR",3},
					   {0XBD,"CJNE R5,#DATA,ADDR",3},
					   {0XBE,"CJNE R6,#DATA,ADDR",3},
					   {0XBF,"CJNE R7,#DATA,ADDR",3},
					   {0XC0,"PUSH ADDR",2},
					   {0XC1,"AJMP ADDR",2},
					   {0XC2,"CLR ADDR",2,},
					   {0XC3,"CLR C",1},
					   {0XC4,"SWAP A",1},
					   {0XC5,"XCH A,ADDR",2},
					   {0XC6,"XCH A,@R0",1},
					   {0XC7,"XCH A,@R1",1},
					   {0XC8,"XCH A,R0",1},
					   {0XC9,"XCH A,R1",1},
					   {0XCA,"XCH A,R2",1},
					   {0XCB,"XCH A,R3",1},
					   {0XCC,"XCH A,R4",1},
					   {0XCD,"XCH A,R5",1},
					   {0XCE,"XCH A,R6",1},
					   {0XCF,"XCH A,R7",1},
					   {0XD0,"POP ADDR",2},
					   {0XD1,"ACALL ADDR",2},
					   {0XD2,"SETB ADDR",2},
					   {0XD3,"SETB C",1},
					   {0XD4,"DA A",1},
					   {0XD5,"DJNZ ADDR,ADDR",3},
					   {0XD6,"XCHD A,@R0",1},
					   {0XD7,"XCHD A,@R1",1},
					   {0XD8,"DJNZ R0,ADDR",2},
					   {0XD9,"DJNZ R1,ADDR",2},
					   {0XDA,"DJNZ R2,ADDR",2},
					   {0XDB,"DJNZ R3,ADDR",2},
					   {0XDC,"DJNZ R4,ADDR",2},
					   {0XDD,"DJNZ R5,ADDR",2},
					   {0XDE,"DJNZ R6,ADDR",2},
					   {0XDF,"DJNZ R7,ADDR",2},
					   {0XE0,"MOVX A,@DPTR",1},
					   {0XE1,"AJMP ADDR",2},
					   {0XE2,"MOVX A,@R0",1},
					   {0XE3,"MOVX A,@R1",1},
					   {0XE4,"CLR A",1},
					   {0XE5,"MOV A,ADDR",2},
					   {0XE6,"MOV A,@R0",1},
					   {0XE7,"MOV A,@R1",1},
					   {0XE8,"MOV A,R0",1},
					   {0XE9,"MOV A,R1",1},
					   {0XEA,"MOV A,R2",1},
					   {0XEB,"MOV A,R3",1},
					   {0XEC,"MOV A,R4",1},
					   {0XED,"MOV A,R5",1},
					   {0XEE,"MOV A,R6",1},
					   {0XEF,"MOV A,R7",1},
					   {0XF0,"MOVX @DPTR,A",1},
					   {0XF1,"ACALL ADDR",2},
					   {0XF2,"MOVX @R0,A",1},
					   {0XF3,"MOVX @R1,A",1},
					   {0XF4,"CPL A",1},
					   {0XF5,"MOV ADDR,A",2},
					   {0XF6,"MOV @R0,A",1},
					   {0XF7,"MOV @R1,A",1},
					   {0XF8,"MOV R0,A",1,},
					   {0XF9,"MOV R1,A",1,},
					   {0XFA,"MOV R2,A",1,},
					   {0XFB,"MOV R3,A",1,},
					   {0XFC,"MOV R4,A",1,},
					   {0XFD,"MOV R5,A",1,},
					   {0XFE,"MOV R6,A",1,},
					   {0XFF,"MOV R7,A",1,},
  /* dummy for hex 100*/         	   {0X100," ",0}  // nobytes changed to 0..necessary...

	
			      };





extern void dump_file(FILE *fp);
extern char * substr(char *,int,int);
extern char * remove_all_spaces(char *);
extern char * trim(char *);   // this functions removes all leading and trailing white spaces and reduces all interveining spaces to one...


struct instruct_info 
			{
				int hex_array[3] ;
				int nobytes ;
				int label_flag ;
				char labels[2][20] ;
			};
struct instruct_info  *info ;
struct gas51_file_info *temp_info ;

//info = (struct instruct *)malloc(sizeof(struct instruct_info));
//temp_info = (struct gas51_file_info *)malloc(sizeof(struct gas51_file_info)) ;



struct instruct_info * assemble(char *);   //this returns the number of bytes in an instruction...

//int *assemble(char *);   //this returns the number of bytes in an instruction...
void push (struct gas51_file_info *temp_info );  

struct gas51_file_info * pop(void);

int get_tokens(char t_addr[][],char *instruction);

int isstandard(char *token);

int islabel(char *token);

FILE *pass1(FILE *fpasmfile)
{
	/* inside pass1 of assembler...*/
//	info = (struct instruct *)malloc(sizeof(struct instruct));
//	temp_info = (struct gas51_file_info *)malloc(sizeof(struct gas51_file_info)) ;


	FILE *fpdest ;
	static unsigned int LocCounter=0;   //location counter for pass1 of assembler...
	static unsigned int symtab_index=0;
	//int no_bytes;
	static char esc_seq[2]={187,'\0'};
	unsigned int i,m;
	unsigned char buff[160],tempbuff[160]; // unsigned char is taken so that the gas51 escape character comes within range...
	char AssemblyInstruction[80];
	char Label[20];
	char ch ,str[10] ;  //dummy variables...
//	dump_file(fpasmfile);   //may be de-commented during debugging...

	//puts(gas51_file_being_assembled);
	//fpasmfile = fopen(gas51_file_being_assembled,"r" );
	info = (struct instruct_info *)malloc(sizeof(struct instruct_info));
	//info = malloc(3*sizeof(int));
	temp_info = (struct gas51_file_info *)malloc(sizeof(struct gas51_file_info)) ;


	printf("\n\n");
	rewind(fpasmfile);   //rewinding pointer before beginning pass1 of assembly process...
	fpdest = tmpfile();
	while( fgets(buff,160,fpasmfile))

	{
		gas51_line_no++ ;
		if( (i=pat_index(buff,esc_seq))==0 )
		{

		for(i=0;i<strlen(buff);i++)
		{
		    if(buff[i]==';' )  // in order to account for the comment indicator...
		    	break;
		}
		buff[i]='\0' ;



		//puts(buff);
		if( (i=pat_index(buff,":"))   )
		{
			strcpy(Label,substr(buff,1,i-1));  //i-1 since we do not want the trailing ':' to not appear in the symbol table...
			strcpy(Label,remove_all_spaces(Label));

			strcpy(gas51_symbol_table[symtab_index].Symbol , Label);   //copying the label into the symbol table...
			gas51_symbol_table[symtab_index].Address = LocCounter ;
		        symtab_index++;


			strcpy(AssemblyInstruction,substr(buff,i+1,strlen(buff)-i-1));  //extracting the last part of the instruction...
			strcpy(AssemblyInstruction,trim(AssemblyInstruction));

		}


		else if(i==0)
			strcpy(AssemblyInstruction,trim(buff));  //without any label defined, construction of instructions is very simple...
			


			// instruction available at this pint, go ahead and assemble it...  ;)
			if((strcasecmp(AssemblyInstruction," " ))==0)
				continue;
			
			if( (pat_index(AssemblyInstruction,".org"))==1)
			{
				sscanf(AssemblyInstruction,"%s %4x",str,&LocCounter);
				continue ;


			}
			
			
			info = assemble(AssemblyInstruction) ; //getting all the info about the instruction in a struct...
			
			
			if(info->label_flag==0 )        // means instructions has no label...normal processing...
			{
				for(m=0;m<info->nobytes;m++)
					{
						fprintf(fpdest,"%.4X %.2X\n",LocCounter,info->hex_array[m]);  //writing into temp hexfile...
						LocCounter++;
					}		
			
			}
			
			else if(info->label_flag)      // means instructions contains label...
			{
				
				fprintf(fpdest,"%.4X %.2X\n",LocCounter,info->hex_array[0]);  // writing opcode into file...only operands
			        LocCounter++;  						      // will be replaced by lables themselves...
				
				if(info->label_flag==2 && info->nobytes==3)
				{
					fprintf(fpdest,"%.4X %s    %s  %d\n",LocCounter,info->labels[0],gas51_file_being_assembled,gas51_line_no);
					LocCounter++;	
					fprintf(fpdest,"%.4X %s    %s  %d\n",LocCounter,info->labels[1],gas51_file_being_assembled,gas51_line_no);
					LocCounter++;


				}
		
				else if(info->label_flag==1 && info->nobytes==2)
				{
					fprintf(fpdest,"%.4X %s    %s  %d\n",LocCounter,info->labels[0],gas51_file_being_assembled,gas51_line_no);
					LocCounter++;

				}

				else if(info->label_flag==1 && info->nobytes==3)
				{
					fprintf(fpdest,"%.4X %s    %s  %d\n",LocCounter,info->labels[0],gas51_file_being_assembled,gas51_line_no);
					LocCounter++;
					fprintf(fpdest,"%.4X %c%s    %s  %d\n",LocCounter,185,info->labels[0],gas51_file_being_assembled,gas51_line_no);
					LocCounter++;
	
				}


				
				/*		fprintf(fpdest,"%.4X %s\n",LocCounter,info->label);	      
				LocCounter++;
			//find a way to know the size of the labelled instruction...	
				if(info->nobytes==3)
				{
					fprintf(fpdest,"%.4X %c%s\n",LocCounter,185,info->label);
					LocCounter++;
				}	*/
			
			
				info->label_flag=0;            //reinitialising flag before next iteration...
			}
			
			
			//strcpy(gas51_symbol_table[symtab_index].Symbol , Label);   //copying the label into the symbol table...
			//gas51_symbol_table[symtab_index].Address = LocCounter ;
		        //symtab_index++;	
			//LocCounter += info->nobytes ;			//and incrementing the LC by sizeof present instruction...
			//printf("%s\n",AssemblyInstruction);
			//printf("%s\n",Label);
		
		}
		
/*		else 
			if(i==0)
			{
				strcpy(AssemblyInstruction,trim(buff));
				
				if((strcasecmp(AssemblyInstruction," " ))==0)
					continue;
						
				info = assemble(AssemblyInstruction) ; //getting the number of bytes in the instruction
				
				for(m=0;m<info->nobytes;m++)
				{
					fprintf(fpdest,"%.4X %.2X\n",LocCounter,info->hex_array[m]);  //writing into temp hexfile...
					LocCounter++;
				}		
			
			
				//fprintf(fpdest,"%.4X %.2X\n",LocCounter,info->hex_array[0]);  //writing into temp hexfile...
				//LocCounter += info->nobytes ;			// incrementing the LC by sizeof present instruction...
				
				
				//printf("%s\n",AssemblyInstruction);
			}
		//sscanf(buff,"%s:%s",Label,Mnemonic);
		
		//printf("%s %s\n",Label,Mnemonic);   */
		



//	}
	
	
		else   // code to handle gas51 special escape sequence...
		{
			if(pat_index(buff,":start"))
				{
					strcpy(temp_info->file,gas51_file_being_assembled);
					temp_info->file_line_no = gas51_line_no ;
					
					push(temp_info);     // pushing the current file info into stack...
					//push(gas51_line_no);
					sscanf(buff,"%c%s%s",&ch,gas51_file_being_assembled,str); //reinit'ing file and line no...	
					gas51_line_no = 0 ;
				}
			else
				if(pat_index(buff,":end"))
					{
						temp_info=pop();
					        strcpy(gas51_file_being_assembled,temp_info->file);
						gas51_line_no = temp_info->file_line_no;	
						gas51_line_no--; // to compensate for the '++' op at start...				
						//current_line_no=pop();
					
					}
					
			
		}
	
	
	
	
	
    }  


	
	
	
	
for(i=0;i<=20;i++)
	
	if(strlen(gas51_symbol_table[i].Symbol)!=0)	
		printf("%s  ->   %X\n",gas51_symbol_table[i].Symbol,gas51_symbol_table[i].Address );
dump_file(fpdest);


return fpdest;


}




struct instruct_info  *assemble(char *Instruction)

//int *assemble(char *Instruction)
{
	
	//static int hex_array[3] ;
	unsigned int i;
	static char tokens[5][10],newtokens[5][10],ins[20];  //a 2D  array of chars to hold instruction tokens...
	char found_flag=0;  //flag to denote match status -> 0 means match not found while 1 means match found...
	int num,m,l ;	
/*	tokens[0]=malloc(10*sizeof(char));
	tokens[1]=malloc(10*sizeof(char));
	tokens[2]=malloc(10*sizeof(char));
	tokens[3]=malloc(10*sizeof(char));
	tokens[4]=malloc(10*sizeof(char));   */
	
	

	//hex_array[0]=-1;  
	//hex_array[1]=-1;     //initialising the array properly before continuing...
	//hex_array[2]=-1;
	
	for (i=0;i<=0xFF;i++)
	{
		if(!strcasecmp(instructions[i].mnemonic,Instruction ))
		{
			found_flag = 1;			// this is the code to test for 1 byte  ins...
			break ;
		}
		
	
	}
	
	
	if(found_flag==1)  //means instruction matched with opcode...
	{
		info->hex_array[0] = instructions[i].hex_code;
		info->nobytes = 1;
		//info = &instructions[i] ;
		return info ;
		//return hex_array;
	
	}
	
	
	else
	{
		//do some stuff here to match a 2 byte or 3 byte instruction...
		// and break the loop immediately if a match occurs..
	
		 num = get_tokens(tokens,Instruction);  //all tokens copied into token array...returns total number of tokens...
		 
		if ((strcasecmp(tokens[0],"cjne")==0) && (num > 4)  )  // when a cjne ins contains more than 4 tokens...
       			{
				gas51_errno = 5 ;
				gas51_perror() ;

			}			

		else if ( (strcasecmp(tokens[0],"cjne")==0) && (num < 4)  )  // when a cjne ins contains less  than 4 tokens...
		{
			gas51_errno = 6 ;
			gas51_perror();
							

		}			
	
		else if( ((strcasecmp(tokens[0],"ljmp")==0) ||  (strcasecmp(tokens[0],"lcall")==0)  ) &&  (num>2)  )
		{
				gas51_errno = 5 ;
				gas51_perror() ;

		}
		
		else if( ((strcasecmp(tokens[0],"ljmp")==0) ||  (strcasecmp(tokens[0],"lcall")==0)  ) &&  (num<2)  )
		{
				gas51_errno = 6 ;
				gas51_perror() ;

		}    
		
					// the basic strategy in this if-else ladder is that execution proceeds only when the number of
					// tokens are *EXACTLY* the same as required by the instruction being assembled or the program 
					//is exited and an error is given, stating either extra or less tokens than expected...   ;) 

		
		
//	else if(     (strcasecmp(tokens[0],"inc")==0)  ||  (strcasecmp(tokens[0],"dec")==0)  ||  (strcasecmp(tokens[0],"ajmp")==0) ||  (strcasecmp(tokens[0],"acall")==0)||  (strcasecmp(tokens[0],"jz")==0)   ||  (strcasecmp(tokens[0],"jnz")==0)  || (strcasecmp(tokens[0],"sjmp")==0) ||  (strcasecmp(tokens[0],"cpl")==0)  || (strcasecmp(tokens[0],"push")==0) ||  (strcasecmp(tokens[0],"clr")==0)  || (strcasecmp(tokens[0],"pop")==0)  ||  (strcasecmp(tokens[0],"setb")==0) ||  && (num>2)  )  



		else if( ((strcasecmp(tokens[0],"inc")==0)   ||  (strcasecmp(tokens[0],"dec")==0)   || \
			  (strcasecmp(tokens[0],"ajmp")==0)  ||  (strcasecmp(tokens[0],"acall")==0) || \
			  (strcasecmp(tokens[0],"jz")==0) ||	(strcasecmp(tokens[0],"jnz")==0)    || \
			  (strcasecmp(tokens[0],"sjmp")==0) ||  (strcasecmp(tokens[0],"cpl")==0)    || \
       			  (strcasecmp(tokens[0],"push")==0) ||  (strcasecmp(tokens[0],"clr")==0)    || \
       			  (strcasecmp(tokens[0],"pop")==0) ||  (strcasecmp(tokens[0],"setb")==0) )  && \
			       								      (num>2)  )
			
		{
				gas51_errno = 5 ;
				gas51_perror() ;

		}  


//		else if( ((strcasecmp(tokens[0],"inc")==0) ||  (strcasecmp(tokens[0],"dec")==0) || (strcasecmp(tokens[0],"ajmp")==0)   ) &&  (num<2)  )

		else if(((strcasecmp(tokens[0],"inc")==0)  ||  (strcasecmp(tokens[0],"dec")==0)  || \
			 (strcasecmp(tokens[0],"ajmp")==0) ||  (strcasecmp(tokens[0],"acall")==0)|| \
			 (strcasecmp(tokens[0],"jz")==0)   ||  (strcasecmp(tokens[0],"jnz")==0)  || \
		         (strcasecmp(tokens[0],"sjmp")==0) ||  (strcasecmp(tokens[0],"cpl")==0)  || \
			 (strcasecmp(tokens[0],"push")==0) ||  (strcasecmp(tokens[0],"clr")==0)  || \
			 (strcasecmp(tokens[0],"pop")==0)  ||  (strcasecmp(tokens[0],"setb")==0)  ) && (num<2)  )
		{
				gas51_errno = 6 ;
				gas51_perror() ;

		}   


		
		else if((strcasecmp(tokens[0],"cjne"))  &&  (strcasecmp(tokens[0],"ljmp" ))  && \
			(strcasecmp(tokens[0],"lcall")) &&  (strcasecmp(tokens[0],"inc" ))   && \
			(strcasecmp(tokens[0],"dec" ))  &&  (strcasecmp(tokens[0],"ajmp" ))  && \
	  		(strcasecmp(tokens[0],"acall")) &&  (strcasecmp(tokens[0],"jz" ))    && \
			(strcasecmp(tokens[0],"jnz" ))  &&  (strcasecmp(tokens[0],"sjmp" ))  && \
			(strcasecmp(tokens[0],"cpl" ))  &&  (strcasecmp(tokens[0],"push" ))  && \
			(strcasecmp(tokens[0],"clr" ))  &&  (strcasecmp(tokens[0],"pop" ))   && \
			(strcasecmp(tokens[0],"setb" )) &&  (num > 3 ) )					


									// region of code where number of tokens present	
		{							// are checked for correctness
			gas51_errno = 5 ;				//this step need not be repeated later on
			gas51_perror();					//during matching 3 byte instructions...
			


		}   
		
	
//	        else if( strcasecmp(tokens[0],"cjne")  && (strcasecmp(tokens[0],"ljmp" ))  &&  (strcasecmp(tokens[0],"lcall" )) && (strcasecmp(tokens[0],"inc" )) &&  (strcasecmp(tokens[0],"dec" )) && (num < 3 ) )	
		else if( (strcasecmp(tokens[0],"cjne"))  && (strcasecmp(tokens[0],"ljmp" ))  && \
				(strcasecmp(tokens[0],"lcall" )) && (strcasecmp(tokens[0],"inc" )) &&  \
				(strcasecmp(tokens[0],"dec" )) &&    (strcasecmp(tokens[0],"ajmp" )) && \
				(strcasecmp(tokens[0],"acall" )) &&  (strcasecmp(tokens[0],"jz" )) && \
				(strcasecmp(tokens[0],"jnz" )) &&  (strcasecmp(tokens[0],"sjmp" )) && \
				(strcasecmp(tokens[0],"cpl" )) &&  (strcasecmp(tokens[0],"push" )) && \
				(strcasecmp(tokens[0],"clr" )) &&  (strcasecmp(tokens[0],"pop" )) && \
				(strcasecmp(tokens[0],"setb" )) && (num < 3 ) )				
		{

			gas51_errno = 6 ;
			gas51_perror();

		}   

		else 
		{	//everything ok...number of tokens are correct...proceeding with matching process...
			
			
                  
			for(i=0;i<num;i++)
			{
			/*	if(!strcasecmp(tokens[i],"A"))
				{
					
					strcpy(tokens[i],"0E0");
					//continue ;
				}  */
						
				if(!strcasecmp(tokens[i],"B"))
				{
					strcpy(tokens[i],"0F0");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0xF0);
					//continue ;
				}

				else
				if(!strcasecmp(tokens[i],"PSW"))
				{
					strcpy(tokens[i],"0D0");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0xD0);
					//continue ;
				}
				
				else
				if(!strcasecmp(tokens[i],"DPH"))
				{
					strcpy(tokens[i],"83");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x83);
					//continue ;
				}
				
				else
				if(!strcasecmp(tokens[i],"DPL"))
				{
					strcpy(tokens[i],"82");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x82);
					//continue ;
				}
				
				
				else
				if(!strcasecmp(tokens[i],"P0"))
				{
					strcpy(tokens[i],"80");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x80);
					//continue ;
				}
				
				
				else
				if(!strcasecmp(tokens[i],"P1"))
				{
					strcpy(tokens[i],"90");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x90);
					//continue ;
				}
				
				
				else
				if(!strcasecmp(tokens[i],"P2"))
				{
					strcpy(tokens[i],"0A0");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0xA0);
					//continue ;
				}
				
				else
				if(!strcasecmp(tokens[i],"P3"))
				{
					strcpy(tokens[i],"0B0");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0xB0);
					//continue ;
				}
			 
   				else
				if(!strcasecmp(tokens[i],"IP"))
				{
					strcpy(tokens[i],"0B8");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0xb8);
					//continue ;
				}


				else
				if(!strcasecmp(tokens[i],"SP"))
				{
					strcpy(tokens[i],"81");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x81);
					//continue ;
				}
						
				else
				 if(!strcasecmp(tokens[i],"IE"))
				{
					strcpy(tokens[i],"0A8");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0xA8);
					//continue ;
				}


				else
				if(!strcasecmp(tokens[i],"TMOD"))
				{
					strcpy(tokens[i],"89");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x89);
					//continue ;
				}



				else
				if(!strcasecmp(tokens[i],"TCON"))
				{
					strcpy(tokens[i],"88");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x88);
					//continue ;
				}




				else
				if(!strcasecmp(tokens[i],"TH0"))
				{
					strcpy(tokens[i],"8C");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x8C);
					//continue ;
				}


				else
				if(!strcasecmp(tokens[i],"TL0"))
				{
					strcpy(tokens[i],"8A");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x8A);
					//continue ;
				}

				else
				if(!strcasecmp(tokens[i],"TH1"))
				{
					strcpy(tokens[i],"8D");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x8D);
					//continue ;
				}


	
				else
				if(!strcasecmp(tokens[i],"TL1"))
				{
					strcpy(tokens[i],"8B");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x8B);
					//continue ;
				}

				else
				if(!strcasecmp(tokens[i],"SCON"))
				{
					strcpy(tokens[i],"98");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x98);
					//continue ;
				}

				else
				if(!strcasecmp(tokens[i],"SBUF"))
				{
					strcpy(tokens[i],"99");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x99);
					//continue ;
				}

				else
				if(!strcasecmp(tokens[i],"PCON"))
				{
					strcpy(tokens[i],"87");
					//fprintf(fpprehex,"%.4X %.2X\n",addr,0x87);
					//continue ;
				}





			}
			
			
			
			
			
			
			for(i=0,m=1,l=0;i<num;i++)
		     {
			
			
			if (!isstandard(tokens[i]) )   //isstandard() returns 1 if standard , 0 if non-standard token...
			{
				
				
				
				if(islabel(tokens[i])) //islabel() returns number of tokens which are labels , 0 if none...
				{
									//this code handles the token if it is a label...
					info->label_flag++ ;
					strcpy(info->labels[l],tokens[i]);
					strcpy(newtokens[i],"ADDR");   //ADDR placeholder copied into newly created tokens...
					l++;
				}

		   else
				
/*brace marker**/    {
				
				
				
				info->label_flag=0;
				
				if(pat_index(tokens[i],"#"))
					strcpy(newtokens[i],"#DATA");
				
				else 
					strcpy(newtokens[i],"ADDR");
			
				if(tokens[i][0]!='#')
				{
					sscanf(tokens[i],"%X",&info->hex_array[m]);  // writing the operand in hex...
					m++;
				}
				
				else if(tokens[i][0]=='#')
				{
					sscanf(substr(tokens[i],2,strlen(tokens[i])-1) , "%X" ,&info->hex_array[m] );           
					m++;
				}
										
/** brace marker**/    }
			
			
		   }
			   else
				strcpy(newtokens[i],tokens[i]);   //standard tokens are being copied into newtokens array as-it-is...
		  //      	
 			
                    }


		  for(i=0;i<num;i++)
		    {
			if(i==0)
			{    strcpy(ins,newtokens[i]);
			     strcat(ins," ");
		    	}
			
			else 
			{
				strcat(ins,newtokens[i]);
				if(i<num-1)
					strcat(ins,",");
			}
	//		else if(i<num-1)
	//			strcat(ins,",");
			//strcat(ins,newtokens[i+1]);
			
		    }
	
     for (i=0;i<=0xFF;i++)
	    {
		if(!strcasecmp(instructions[i].mnemonic,ins ))
		{
			found_flag = 1;			// this is the code to test for 2 byte  ins...
			break ;
		}
		
            }
	
	
	}///////////



 }

	if(found_flag==1 )
	{
		info->hex_array[0] = instructions[i].hex_code ;
		if ( instructions[i].hex_code==0x2 || instructions[i].hex_code==0x12  ) //for ljmp or lcall instructions we must break up the
		{								        // one 2-byte operand into
										        // two 1-byte operands  ;-)
			info->hex_array[2] = info->hex_array[1] % 0x100 ;	//a very clever way to avoid using a temp variable...
			info->hex_array[1] = info->hex_array[1] / 0x100 ;       //by generating the ls-byte first and then the ms-byte...
		
		}
		
		info->nobytes = instructions[i].nobytes ;   			
		//return hex_array ;
		//hex_array = 
		//info = &instructions[i] ;
		return info ;

	}
	
	
/*	else
	{

		// do some stuff here to match a 3 byte instruction...
		// and break the loop immediately if a match occurs...




	}
	
	
	if(found_flag==1)
	{
		//return hex_array ;
		//info = &instructions[i];
		return info ;
	

	}  */


			      // we have reached here means that all possible ins have been searched..so there must be an error...	
	else                          // this should come after all instructions are checked...
	{
		gas51_errno = 4 ;   // 4 is the error code for illegal instruction...
		gas51_perror();
		//exit(1);			
	}
	
	
	
	
	//return 0;

}



void push (struct gas51_file_info *temp_info )  
{
	gas51_file_info_stack[gas51_stack_index] = *(temp_info) ;  // hope this copies the whole structure...
	gas51_stack_index++ ;
	
}




struct gas51_file_info * pop(void)

{

	struct  gas51_file_info *temp_info ;
	gas51_stack_index--;

	temp_info = &(gas51_file_info_stack[gas51_stack_index]);

	return temp_info ;
	

}


int get_tokens(char t_addr[][10],char *instruction)
{

	unsigned int i,j,k;
	char buff[10];
	i=0;
	j=0;
	k=1;
	//puts(instruction);           // this was really VERY ANNOYING....;-{ finding this line...
	while(instruction[i]!=' '   )   //at this point we may be sure that only a sinle space will be between 1st and 2nd token...
	{
		buff[j]=instruction[i] ;
		i++;
		j++;	


	}		

	buff[j] = '\0' ; // terminating buff with a trailing NULL...
	strcpy(t_addr[0],buff);   //first token gone...two more to go...

	i++;  //to get over the single space...
	j=0 ;  //reiniting j for a new buff...   
	
while(1)
{
	if(instruction[i]=='\n' || instruction[i]=='\0')
	{
		
		buff[j] = '\0' ;
		strcpy(t_addr[k],buff);
		if(strlen(buff))   //increment only if buff is non empty...
		  k++;
		break ;

	}

	
	if(instruction[i]==',' || instruction[i]==' ' || instruction[i]=='\t')
	{ 
		buff[j] = '\0' ;
		strcpy(t_addr[k],buff);
		if(strlen(buff))   // increment only if buff is non empty...
			k++;
		i++;
		j=0;
	}

	else
	{
		buff[j]=instruction[i];
		i++;
		j++;


	}



}

	
	
	
	
	
	/*	while(1)
	{
		





	}   */



	
	
/*	while(instruction[i]!=',' )
	{
		buff[j] = instruction[i];
		i++;
		j++;
	}
	
	buff[j] = '\0' ; //terminating buff with a trailing NULL...	
	strcpy(t_addr[1],buff);  //second token gone...one more to go...
	
	i++;
	j=0;
	while(instruction[i]!='\n')
	{
		buff[j] = instruction[i];
		i++;
		j++;
		



	}    */

	





	
	
return k ;   // returning the total number of tokens found...

	
}


int isstandard(char *token)
{

	//int retval=0 ;
	if(!strcasecmp(token,"ajmp"))
		return 1 ;
	
	else if(!strcasecmp(token,"ljmp"))
		return 1;	

	else if(!strcasecmp(token,"inc"))
		return 1;	

	else if(!strcasecmp(token,"jbc"))
		return 1;	

	else if(!strcasecmp(token,"acall"))
		return 1;	

	else if(!strcasecmp(token,"lcall"))
		return 1;	

	else if(!strcasecmp(token,"dec"))
		return 1;	

	else if(!strcasecmp(token,"jb"))
		return 1;	

	else if(!strcasecmp(token,"add"))
		return 1;	

	else if(!strcasecmp(token,"jnb"))
		return 1;	

	else if(!strcasecmp(token,"addc"))
		return 1;	

	else if(!strcasecmp(token,"jc"))
		return 1;	

	else if(!strcasecmp(token,"orl"))
		return 1;	

	else if(!strcasecmp(token,"jnc"))
		return 1;	

	else if(!strcasecmp(token,"anl"))
		return 1;	

	else if(!strcasecmp(token,"jz"))
		return 1;	

	else if(!strcasecmp(token,"xrl"))
		return 1;	

	else if(!strcasecmp(token,"jnz"))
		return 1;	

	else if(!strcasecmp(token,"mov"))
		return 1;	

	else if(!strcasecmp(token,"sjmp"))
		return 1;	

	else if(!strcasecmp(token,"subb"))
		return 1;	

	else if(!strcasecmp(token,"cpl"))
		return 1;	

	else if(!strcasecmp(token,"cjne"))
		return 1;	

	else if(!strcasecmp(token,"push"))
		return 1;	

	else if(!strcasecmp(token,"clr"))
		return 1;	

	else if(!strcasecmp(token,"xch"))
		return 1;	

	else if(!strcasecmp(token,"pop"))
		return 1;	

	else if(!strcasecmp(token,"setb"))
		return 1;	

	else if(!strcasecmp(token,"djnz"))
		return 1;	

	else if(!strcasecmp(token,"a"))
		return 1;	
/*
	else if(!strcasecmp(token,"b"))
		return 1;	

	else if(!strcasecmp(token,"@r0"))
		return 1;	
	else if(!strcasecmp(token,"@r1"))
		return 1;	

	else if(!strcasecmp(token,"r0"))
		return 1;	

	else if(!strcasecmp(token,"r1"))
		return 1;	

	else if(!strcasecmp(token,"r2"))
		return 1;	

	else if(!strcasecmp(token,"r3"))
		return 1;	

	else if(!strcasecmp(token,"r4"))
		return 1;	

	else if(!strcasecmp(token,"r5"))
		return 1;	

	else if(!strcasecmp(token,"r6"))
		return 1;	

	else if(!strcasecmp(token,"r7"))
		return 1;	

	else if(!strcasecmp(token,"psw"))
		return 1;	

	else if(!strcasecmp(token,"dptr"))
		return 1;	

	else if(!strcasecmp(token,"p0"))
		return 1;	

	else if(!strcasecmp(token,"p1"))
		return 1;	

	else if(!strcasecmp(token,"p2"))
		return 1;	

	else if(!strcasecmp(token,"p3"))
		return 1;	

	else if(!strcasecmp(token,"ip"))
		return 1;	

	else if(!strcasecmp(token,"ie"))
		return 1;	

	else if(!strcasecmp(token,"tmod"))
		return 1;	

	else if(!strcasecmp(token,"tcon"))
		return 1;	

	else if(!strcasecmp(token,"th0"))
		return 1;	

	else if(!strcasecmp(token,"tl0"))
		return 1;	

	else if(!strcasecmp(token,"th1"))
		return 1;	

	else if(!strcasecmp(token,"tl1"))
		return 1;	

	else if(!strcasecmp(token,"scon"))
		return 1;	

	else if(!strcasecmp(token,"sbuf"))
		return 1;	

	else if(!strcasecmp(token,"pcon"))
		return 1;	

	else if(!strcasecmp(token,"c"))
		return 1;	

	else if(!strcasecmp(token,"rs0"))
		return 1;	

	else if(!strcasecmp(token,"rs1"))
		return 1;	
*/
/*	else if(!strcasecmp(token,""))
		return 1;	

	else if(!strcasecmp(token,""))
		return 1;	

	else if(!strcasecmp(token,""))
		return 1;	

	else if(!strcasecmp(token,""))
		return 1;	

	else if(!strcasecmp(token,""))
		return 1;	

	else if(!strcasecmp(token,""))
		return 1;	

	else if(!strcasecmp(token,""))
		return 1;	

	else if(!strcasecmp(token,""))
		return 1;	

	else if(!strcasecmp(token,""))
		return 1;	

	else if(!strcasecmp(token,""))   
		return 1;	*/
	
	else
		return 0;      //means the token is not a keyword or a standard token...but an address,data,sfr or label



}
	


	
int islabel(char *token)
{

	if(( *(token+0))=='_' )
		return 1;          //label may start with an underscore...

	else if(  isalpha( ( *( token+0) ) ) )
		return 1;          //label may begin witn an alphabet...then succeeding characters are irrelevant...

	else if(  isdigit( ( *( token+0) ) ) )
		return 0;          //label cannot start with a digit...this will be interpreted as a misformed number,hex or otherwise...


}

	

