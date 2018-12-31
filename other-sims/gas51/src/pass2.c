//#define _PASS1_
#include"gas51.h"
//extern struct gas51_symtab gas51_symbol_table[];
extern char *remove_all_spaces(char *);
extern char *trim(char *);
extern void dump_file(FILE *);
FILE * pass2(FILE *fprawfile)
{
	/* inside pass2 of assembler...*/
	FILE *fpprehex;
	char buff[160];
	unsigned int addr,opcode,line_no,i,index,destADDR;
	int AddrDiff ;
	unsigned char filename[20],value[20],operand;
	fpprehex=tmpfile();
	rewind(fprawfile);				
	index=0 ;
	while( fgets(buff,160,fprawfile))
	{
			
		//strcpy(buff,trim(buff));
		i=sscanf(buff,"%4X %s  %s %u",&addr,value,filename,&line_no );

		if(i==2 ) //&& (strcasecmp(value,"01")!=0) && (strcasecmp(value,"11")!=0) )    //means there are no labels in the line,so proceed...
		{
			if( (strcasecmp(value,"01")!=0) && (strcasecmp(value,"11")!=0)  )
				fprintf(fpprehex,buff);
			sscanf(value,"%X",&opcode);
			continue ;
		}

		else if(i==4)   //means this line contains a label...and we need not consider other values of i because it will
				// be ALWAYS either 2 or 4...that's the way the first pass prepares the intermediate file for pass2...
		{
			
			strcpy(gas51_file_being_assembled,filename) ;
			gas51_line_no = line_no ;
			if( *(value+0)==185 )
				continue ;
			else
			{
				
/*				if(!strcasecmp(value,"A"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0xE0);
					continue ;
				}
						
				if(!strcasecmp(value,"B"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0xF0);
					continue ;
				}

		
				if(!strcasecmp(value,"PSW"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0xD0);
					continue ;
				}
				
				
				if(!strcasecmp(value,"DPH"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x83);
					continue ;
				}
				
				
				if(!strcasecmp(value,"DPL"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x82);
					continue ;
				}
				
				
				
				if(!strcasecmp(value,"P0"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x80);
					continue ;
				}
				
				
				
				if(!strcasecmp(value,"P1"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x90);
					continue ;
				}
				
				
				
				if(!strcasecmp(value,"P2"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0xA0);
					continue ;
				}
				
				
				if(!strcasecmp(value,"P3"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0xB0);
					continue ;
				}
			

				if(!strcasecmp(value,"IP"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0xb8);
					continue ;
				}



				if(!strcasecmp(value,"SP"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x81);
					continue ;
				}
		
		
				
				 if(!strcasecmp(value,"IE"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0xA8);
					continue ;
				}



				if(!strcasecmp(value,"TMOD"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x89);
					continue ;
				}




				if(!strcasecmp(value,"TCON"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x88);
					continue ;
				}





				if(!strcasecmp(value,"TH0"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x8C);
					continue ;
				}



				if(!strcasecmp(value,"TL0"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x8A);
					continue ;
				}


				if(!strcasecmp(value,"TH1"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x8D);
					continue ;
				}




				if(!strcasecmp(value,"TL1"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x8B);
					continue ;
				}

				if(!strcasecmp(value,"SCON"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x98);
					continue ;
				}


				if(!strcasecmp(value,"SBUF"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x99);
					continue ;
				}


				if(!strcasecmp(value,"PCON"))
				{
					fprintf(fpprehex,"%.4X %.2X\n",addr,0x87);
					continue ;
				}

				*/
			
								
				while(index<100)
				{
					if ( (strcmp(gas51_symbol_table[index].Symbol,value ))==0)  // label matches symbol...
				
						{
							
							if(  (opcode%16)==1  ) //this line accounts for all possible 'AJMP'
									       //and 'ACALL' instrutctions that alternate regularly
									      //starting with 0x01,0x11,0x21,0x31,0x41...( very clever ;p...)
							{
								
								if(  (gas51_symbol_table[index].Address & 0xf800) != ((addr+2) & 0xf800)  )
									{
										gas51_errno = 3;
										gas51_perror();
						
									
									}
								else
								{
									if(opcode==0x01)  //means it is a 'AJMP' instruction...
										opcode = 2*((gas51_symbol_table[index].Address & 0x0700 ) >> 8)*16 + 1 ;

									else if(opcode==0x11) //means it is an 'ACALL' instruction...
										opcode = ( 2*((gas51_symbol_table[index].Address & 0x700) >> 8) + 1 )*16 +1 ;
					
									operand = (gas51_symbol_table[index].Address & 0xff) ;




								}
								
								fprintf(fpprehex,"%.4X %.2X\n",addr-1,opcode);
								fprintf(fpprehex,"%.4X %.2X\n",addr,operand);
								
								index = 0;
								break ;
								/*cur_page = (addr+1) & 0xf800 ;
								destADDR = gas51_symbol_table[index].Address
		
									switch(opcode)
									     {

		            								case (0x01 || 0x11):
									                	abs_addr = 0x000 + destADDR; // these are 
												break;		//the 11 bit abs addresses..
			            							
											case (0x21 || 0x31):
										                abs_addr = 0x100 + destADDR;
		            									break;
	
										        case (0x41 || 0x51):
	               									        abs_addr = 0x200 + destADDR;
			          								  break;
	
										         case (0x61 || 0x71):
										                abs_addr = 0x300 + destADDR;
											            break;
										         case (0x81 || 0x91):
									              		abs_addr = 0x400 + destADDR;
										            	break;

										         case (0xa1 || 0xb1):
	                                                                                        abs_addr = 0x500 + destADDR;
											        break;
											    
										         case (0xc1 || 0xd1):
											    abs_addr = 0x600 + destADDR;
											    break;
										
											 case (0xe1 || 0xf1):
											    abs_addr = 0x700 + destADDR;
											    break;
																										             }
						
	
								
							
							*/
							
							}

							else if( opcode==0x02 || opcode==0x12) //for 'LJMP' and 'LCALL' instructions...
							{
							   /*	AddrDiff = gas51_symbol_table[index].Address - addr ;
									if(AddrDiff > 127 || AddrDiff<-128 )	
									{	
										gas51_errno = 3 ;
										gas51_perror();

									}
								else 
									operand = gas51_symbol_table[index].Address - addr ;	
										
										
							*/		
							fprintf(fpprehex,"%.4X %.2X\n",addr,gas51_symbol_table[index].Address/0x100);
							fprintf(fpprehex,"%.4X %.2X\n",addr+1,gas51_symbol_table[index].Address%0x100);
							fgets(buff,160,fprawfile);
							index = 0;
							break ;
																						

							}
							
					//		else if(opcode ==0x85)  // for MOVE ADDR,ADDR ins..which uses addresses as-they-are..
						  /*	{
								
								fprintf(fpprehex,"%.4X  %.2X\n",addr,gas51_	
							



							}   */
							
							
							
							
							else  // for all others, which all use relative displacement...
							{	
								AddrDiff = gas51_symbol_table[index].Address - (addr+1) ;
								if(AddrDiff > 127 || AddrDiff<-128 )	
									{	
										gas51_errno = 3 ;
										gas51_perror();

									}
								else 
									operand = gas51_symbol_table[index].Address - (addr+1) ;	
										
								
								
								
								
								
								fprintf(fpprehex,"%.4X %.2X\n",addr,operand);
							//fgets(buff,160,fprawfile);
							index=0;
							break;							

							}


						}

					index++;

				}
		

			}


		}
	
	
	
	
	
	
	
	
	}
	



printf("\n\n\n");
	
dump_file(fpprehex);

	
return fpprehex;




	

}
