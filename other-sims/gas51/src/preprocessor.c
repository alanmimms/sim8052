//#include"vars.c"
#include"gas51.h"
#define IS_NOT_DEFINED 0
#define IS_DEFINED 1

int need_preprocessing=1; //Flag to indicate that file still requires preprocessing...'1' means 'YES' and '0' means 'NO'

FILE * line_splice(FILE *);    //implemented...
char * join_line(FILE **fpsrc,char *buff);  //implemented...
char * substr(char *str,int pos,int length); //implemented...
int pat_index(char *text, char *pattern);   //INDEX //implemented...
char * insert(char *text,int pos,char *string); //INSERT      //implemented...
char * delete(char *text,int pos,int length); //DELETE        //implemented...
char * replace_all(char *text,char *symbol,char *replacement); //REPLACE_ALL...
char * trim(char *text); //TRIMMING FUNCTION...
FILE * expand_macro(FILE *srcfile,char *macro,char *expansion); //REPLACE_ALL_IN_FILE		


char dest[80];

void dump_file(FILE *);
void gas51_perror();
FILE * include_file(char *arg,FILE *file,long pos);
int pat_index(char *,char *);
char * remove_all_spaces(char *);
FILE * preprocess(char *file_to_preprocess)   //function to preprocess the assembly file...
{
	FILE *fp;
	char buff[240]={0},line[240];
	char *buff_cleaned;
	char directive_arg[15],directive_expansion[15],directive_name[15],directive_symbol[15]  ;
	int i,j,l;
	fp=fopen(file_to_preprocess,"r");
	//gas51_line_no = 0;
	
	while(need_preprocessing)
	
	{
		while( fgets(buff,80,fp) )  {
		//gas51_line_no++;
		for(i=0;i<=strlen(buff);i++)
		{	
		    if(buff[i]==';')
		    	break;	    
		}
		buff[i]='\0' ;

            if(pat_index(buff,"#include")) /****EXTREMELY IMPORTANT!!!  there must be NO SPACE BETWEEN the '#' and 'include' ...**/
			{
			buff_cleaned = remove_all_spaces(buff) ;
   			for(i=9,j=0;i<=strlen(buff_cleaned);i++,j++) // in this case filename starts from 10th location or 9th index...
				directive_arg[j]=buff_cleaned[i] ;			
			directive_arg[strlen(directive_arg)-1] = '\0' ;  //to replace the last '>' with NULL...
			
			fp=include_file(directive_arg,fp,ftell(fp));   
			rewind(fp);
			}
	
			
	    //else
            //	if(pat_index(buff,"#define")) /****EXTREMELY IMPORTANT!!!  there must be NO SPACE BETWEEN the '#' and 'define' ...**/

	    //	{
	   // 	}
	
	
	
	}


fp=line_splice(fp); //line_splice need not be as complicated as defined below using recursion...
		    // if last char is a '\' then simply inserting a leading ';' in next line solves the whole problem
		    // line remains a comment as well as line number info remains intact...
		    // this will be replaced by the simpler version in the next release of gas51... cmanta ;)

rewind(fp);   // preparing for macro expansion...
while(fgets(buff,240,fp))
{
	//gas51_line_no++;
		for(i=0;i<=strlen(buff);i++)
		{	
		    if(buff[i]==';')
		    	break;	    
		}
		buff[i]='\0' ;
	if(pat_index(buff,"#define")) /****EXTREMELY IMPORTANT!!!  there must be NO SPACE BETWEEN the '#' and 'define' ...**/
    	{
    		sscanf(buff,"%s%s%s",directive_name,directive_symbol,directive_expansion);
		fp=expand_macro(fp,directive_symbol,directive_expansion);
		rewind(fp);	
	
	}
	




    }


rewind(fp); // rewinding pointer before checking for more preprocessor directives...
while(fgets(buff,240,fp))
{
	//gas51_line_no++;
		for(i=0;i<=strlen(buff);i++)
		{	
		    if(buff[i]==';')
		    	break;	    
		}
		buff[i]='\0' ;
	if( (pat_index(buff,"#define")) || (pat_index(buff,"#include"))   ||  (pat_index(buff,"#ifdef"))  ) /****EXTREMELY IMPORTANT!!!  there must be NO SPACE BETWEEN the '#' and 'define'..., list all directives here...*/  
		
    	{
		need_preprocessing=1;  // file still requires preprocessing...so continue iterating... 	
		rewind(fp);  // rewinding pointer for next iteration...
		break;
	}
	
	else
		need_preprocessing=0;  // loop will not run the next time...

}


}  /////////////////////


//dump_file(fp);  // this dumps the temporary file...just debugging purpose...no need to rewind pointer..dump does this automatically....
//fclose(fp);
return fp;

}


int pat_index(char *src_str,char *substr)

{
	int i=0,j=0,k=0,retval=0;
	int len_substr , len_src_str ;
	char temp_str[10];
	len_substr = strlen(substr) ;
	len_src_str = strlen(src_str) ;
	for(i=0;i<(len_src_str - len_substr);i++)    {    
	
	for(j=0,k=i;k<i+len_substr;j++,k++)  {
		temp_str[j]=src_str[k] ;
	}
	
	temp_str[j] = '\0' ;
	if(!strcasecmp(temp_str,substr))
	{
		retval=i+1;  //we have to increment i here coz arrays start with 0 but column no. in
		break;	     //a file starts with 1...	
	}
	else 
		retval=0;	
	
	
	}
 			

return retval;

}




FILE * include_file(char *file_to_include,FILE *newfp, long pos)
{

	FILE *fpsrc,*fptemp,*fpdest;
	
  	int i=0,newfd;
	
	char *fname1, *fname2 ,buff[80] ,tempbuff[40];//tempnambuff[12]="gas51XXXXXX";
	char const1[]="/usr/include/gas51/" ;
	
	//extern int gas51_sys_errlist[100];
	char const2[]="./" ;
	
	fname1=strcat(const1 ,file_to_include)  ;
	
	fname2=strcat(const2 ,file_to_include) ;

	// fptemp points to .asm file, fpdest points to .asm.tmp file,

	if ( ((fpsrc=fopen(fname1 ,"r")) )  ||  ( (fpsrc=fopen(fname2,"r")) ))
	{
       		// code to include file contents goes here...
		
		rewind(newfp);
		fptemp=newfp;   //sourcefile..
		fpdest=tmpfile();  //destination file ...
		while(1)
		{
			fgets(buff,80,fptemp) ;
			if(  (ftell(fptemp)) == pos  )
				break;
			else
				fprintf(fpdest,"%s",buff);
	
		}
		
		
	
		
		//fseek(fptemp,pos,SEEK_SET);
	
		fprintf(fpdest,"; EXTRA LINE ADDED BY gas51 TO COMPENSATE FOR LINE NUMBER INFO DUE TO '#include'...\n");		

		/* PART OF NEW PLAN TO EMBED ASSEMBLER INFO IN FILE ITSELF...*/
		fprintf(fpdest,"%c %s :start\n",187,file_to_include);
		//fprintf(fpdest,"--------------------INCLUDE FILE %s BELOW-----------------------\n",file_to_include);
		
		
		while( fgets(buff,80,fpsrc)  )
		{
			fprintf(fpdest,"%s",buff);
				
		}
			
		//fprintf(fpdest,"--------------------END OF INCLUDE FILE %s-----------------------\n",file_to_include);
		fprintf(fpdest,"%c %s :end\n",187,file_to_include);
		
		
		fseek(fptemp,pos,SEEK_SET);

		
		while( fgets(buff,80,fptemp)  )
		{
			fprintf(fpdest,"%s",buff);
				
		}
		
			
		fclose(fpsrc);
		fclose(fptemp);		
		return fpdest;
	
	
	
	
	}	
		

	else
		
	{
		gas51_errno = 0 ;  // 0 -> code for file not found!!
		gas51_perror() ;
		exit(1) ;	
	
	}
		

}


char * remove_all_spaces(char *buff_to_clean)
{

	int i,j,k;
	static char cleaned_buff[80];
	for(i=0,j=0;i<strlen(buff_to_clean);i++)
	{
		if(buff_to_clean[i]!=' ' && buff_to_clean[i]!='\t' && buff_to_clean[i]!='\n' && buff_to_clean[i]!='\r' )
			{
				cleaned_buff[j] = buff_to_clean[i];
				j++;
			}
		else 
			continue;


	}


	cleaned_buff[j]= '\0' ;

	return cleaned_buff ;

}
			

char * trim(char *buff_to_trim)
{

	int i,j;
	char *trimmed_buff;
	char tempbuff[40];
	
	trimmed_buff=malloc(40);
	trimmed_buff[0]='\0' ; //initialising buffer with a null string...
//	for(i=0,j=0;i<strlen(buff_to_trim);)          //this function cuts all words and pastes them with a single space in between...
	//for(;;)
//	{
		i=0;
		j=0;
		while( (buff_to_trim[i]==' ') || (buff_to_trim[i]=='\t') || (buff_to_trim[i]=='\n') )
			i++;
		while( (buff_to_trim[i]!=' ') && (buff_to_trim[i]!='\t' ) && (buff_to_trim[i]!='\n') && (buff_to_trim[i]!='\0'))
		{
			tempbuff[j]=buff_to_trim[i];
			i++;
			j++;	
		}
		
		tempbuff[j]='\0';
		strcat(trimmed_buff,tempbuff);
		strcat(trimmed_buff," ");
		
		while( (buff_to_trim[i]==' ') || (buff_to_trim[i]=='\t') || (buff_to_trim[i]=='\n') )
			i++;

		
		for(j=0;i<strlen(buff_to_trim);i++,j++)
			tempbuff[j]=buff_to_trim[i];	
			
		
		tempbuff[j]='\0' ;

		strcpy(tempbuff,remove_all_spaces(tempbuff));
		strcat(trimmed_buff,tempbuff);


		
		
//	}
	
	//strcpy(gas51_generic_string,trimmed_buff);
		return trimmed_buff;
	

}








void gas51_perror()
{
	printf("gas51: %s : %d : %s \n", gas51_file_being_assembled, gas51_line_no, gas51_errlist[gas51_errno]);
	exit(1);	
}



//void insert_into_define_list(char *Directive_Symbol, char *Directive_Expansion , int flag )
//{


//	gas51_define_list *tempStruct,*tempPtr;

		
	/* forming the define structure prior to insertion into the linked list...*/
	
/*	tempStruct = (gas51_define_list *)malloc(sizeof(gas51_define_list)) ;

	tempStruct->symbol = Directive_Symbol ;

	tempStruct->expansion = Directive_Expansion ; 

	tempStruct->flag = IS_DEFINED ;

	tempStruct->next = NULL ;


	tempPtr = &head ;
	while(tempPtr->next)
	{
	   tempPtr = tempPtr->next ;

	}
	
	
	tempPtr = tempStruct ;

	head.next = tempPtr ;	


	
	
}*/

void dump_file(FILE *fp)
{

	char buff[80];
	rewind(fp);
	while( fgets(buff,80,fp))
		printf("%s",buff);

}


FILE * line_splice(FILE *fpsrc)

{
	// uses join_line function recursively...
	FILE *fpdest;
	int i;
	char buff[80],*tempbuff;
	char tempfile[30];
	rewind(fpsrc);
	
	//strcpy(tempfile,filename);
	//strcat(tempfile,".pp1.tmp");
	//fpsrc = fopen(filename,"r");
	fpdest=tmpfile();
	//fpdest = fopen(tempfile,"w" );
	while( fgets(buff,80,fpsrc) )

	{	// buff[strlen-2] points to the second last element of buff and buff[strlen-1] points to the 
		  // last..and buff[strlen] points to the terminating '\0'  
		if(buff[strlen(buff)-2] == '\\' && buff[strlen(buff)-1]=='\n' )
			
		{
			buff[strlen(buff)-2] = '\0' ;
			tempbuff=join_line(&fpsrc,buff);
			fprintf(fpdest,"%s",tempbuff);
			for(i=0;i<=gas51_no_of_slashes;i++)  //have used '<=' here coz counting is starting from 0 in loop and
							  // no of slahes is one less than actual as first slash is
							// detected before join_line is called...so the '=' and a lesser
							// no_of_slash (less by one) compensate each other... cmanta ;)	
				fprintf(fpdest,"; EXTRA LINE INSERTED BY gas51 TO COMPENSATE FOR MULTI-LINE COMMENTS...\n");
		}
			
			/*buff[strlen(buff)-2] = '\0' ;
			strcpy(tempbuff,buff);
			fgets(buff,80,fpsrc);
			strcat(tempbuff,buff);   //joining the next two lines...
			fprintf(fpdest,"%s",tempbuff);  */


		   

		else 
			fprintf(fpdest,"%s",buff);
	


	}

	//for(i=0;i<=gas51_no_of_slashes;i++)
	//	fprintf(fpdest,"; EXTRA LINE INSERTED BY gas51 TO COMPENSATE FOR LINE NUMBER INFO...\n");
	
	
	
	fclose(fpsrc);
	//fclose(fpdest);
	return fpdest;
	

}


char * join_line(FILE **fpsrcptr,char *buff)

{
	// part of line_splice implementation...
	////char *tempbuff,*tempbuff2;
	char tempbuff[400],tempbuff2[400];
	///tempbuff = (char *)malloc(80 * sizeof(char));
	///tempbuff2 = (char *)malloc(80 * sizeof(char));
	strcpy(tempbuff2,buff);
	//char *Local1,*Local2;
	
	
	fgets(tempbuff,80,*fpsrcptr);
	
	if(tempbuff[strlen(tempbuff)-2] == '\\' && tempbuff[strlen(tempbuff)-1]=='\n' )
		
	{		
		gas51_no_of_slashes++;  //this counts the total number of backslashes in the multi-line comment...
		tempbuff[strlen(tempbuff)-2] = '\0' ;
		strcpy(tempbuff,join_line(fpsrcptr,tempbuff));
		///tempbuff=join_line(fpsrcptr,tempbuff);
		
	}
	
	//free(tempbuff);
	//free(tempbuff2);
	return (strcat(tempbuff2,tempbuff));
	

}


char * substr(char *srcstr,int first_pos,int length)
{

	int i,j;
	//char destbuff[80];
	static char *deststr;//=destbuff;
	deststr=(char *)malloc(80*sizeof(char));
	for(i=first_pos-1,j=0;i<=first_pos + length-2;i++,j++)
		*(deststr+j) = *(srcstr+i);

	*(deststr+j) = '\0' ; 
	//strcpy(gas51_generic_string,deststr);
	//return gas51_generic_string ;
	return deststr;

}






char * insert(char *text,int pos,char *string) //INSERT
{
	char *temp1,*temp2,*temp3 ;
	temp1=malloc(80);
	temp2=malloc(80);
	temp3=malloc(80);

	temp2 = substr(text,1,pos-1);
	strcpy(temp1,temp2);
	strcpy(temp2,string);
	temp3=substr(text,pos,strlen(text)-pos+1);
	strcat(temp2,temp3);
	//strcat(temp2,substr(text,pos,strlen(text)-pos+1)); /* */
	return (strcat(temp1,temp2));

}

char * delete(char *text,int pos,int length) //DELETE
{

	char *temp1,*temp2;
	
	if(pos==0)
		return text;
	
	temp1=malloc(80);
	temp2=malloc(80);
	
	strcpy(temp1,substr(text,1,pos-1));
	strcpy(temp2,substr(text,pos+length,strlen(text)-pos-length+1));
	return strcat(temp1,temp2);
		

}




char * replace_all(char *text,char *symbol,char *replacement) //REPLACE_ALL 


{

	int k,i;
	char t[81],tempreplacement[20];
	char *tptr;
	char *result;
	tptr=t;
	
	//the case when symbol is itself a substring of the replacement...
	if(pat_index(replacement,symbol) )
		{
			strcpy(tempreplacement,replacement);
			do
			{
			  for(i=0;i<strlen(tempreplacement);i++)	
			  (*(tempreplacement+i))++; //changing the value by 1...
			}while(pat_index(replacement,tempreplacement) );
			
		/*replacing text with temporary replacement...*/
		while(k=pat_index(text,symbol))
		{
			tptr=delete(text,k,strlen(symbol));
			text=insert(tptr,k,tempreplacement);
		}

		/*finally replacing temp chars with actual replacements...*/
		while(k=pat_index(text,tempreplacement))
		{
			tptr=delete(text,k,strlen(tempreplacement));
			text=insert(tptr,k,replacement);
		}
		

			
		
	}	
	
	else  //normal case when both are disjoint...
	while(k=pat_index(text,symbol))
	{
		tptr=delete(text,k,strlen(symbol));
		text=insert(tptr,k,replacement);
	}
	
	
	return text;

}


FILE * expand_macro(FILE *fpsrc,char *macro,char *expansion)

{
	char buff[400],newbuff[400],*newbuffptr;
	char part_a[200],part_b[200];
	char *part_a_ptr=part_a;
	char *part_b_ptr=part_b;
	FILE *fpdest;
	int i;
	newbuffptr=newbuff;
	rewind(fpsrc);
	fpdest=tmpfile();
	//fpdest=fopen("test.asm.pp","w+");
	while(fgets(buff,400,fpsrc))
	{
		i=pat_index(buff,";");	
		if(i==0)  //no ';' found in line...
		{
			strcpy(part_a,buff);
			strcpy(part_b,"\0");
		}
		else
		   if(i==1)  // ';' at start of line..pure comment...
		{	
			strcpy(part_a,"\0");
			strcpy(part_b,buff);
					
		}
		   else  //for i!=0 and i!=1 i.e. ';' at middle of line...
		   {	
			   part_a_ptr=substr(buff,1,i-1);
			   part_b_ptr=substr(buff,i,strlen(buff));
		   	   strcpy(part_a,part_a_ptr);
		   	   strcpy(part_b,part_b_ptr);
			   
		   }

		if(pat_index(part_a,"#define") && pat_index(part_a,macro) && pat_index(part_a,expansion) )
		{
			//newbuffptr=strcat(part_a,part_b);	
			fprintf(fpdest,"; LINE AUTOMATICALLY REPLACED BY gas51 TO COMPENSATE FOR '#define'...\n");
			continue;
		}
		else
			if(pat_index(part_a,"#ifdef") || pat_index(part_a,"#ifndef")  )
		{	newbuffptr=strcat(part_a,part_b);	
			fprintf(fpdest,"%s",newbuffptr);
		}
		
		else		
		{		
		  newbuffptr=replace_all(part_a,macro,expansion);	
	          newbuffptr=strcat(newbuffptr,part_b);
		  fprintf(fpdest,"%s",newbuffptr);
			
		}
		
			//newbuffptr=replace_all(buff,macro,expansion);
			//fprintf(fpdest,"%s",newbuffptr);

	}
	fclose(fpsrc);
	return fpdest;


}



