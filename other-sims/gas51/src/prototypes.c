#include<stdio.h>
#include<unistd.h>
#include<stdlib.h>
#include<string.h>
///IMPORTANT...PROGRAM MAY CONTAIN MEMORY LEAK(S)..CHECK BEFORE COMMITITNG..ESPECIALLY FUNCTION 'substr'...
void line_splice(char *filename);    //implemented...
char * join_line(FILE **fpsrc,char *buff);  //implemented...
 

char * substr(char *str,int pos,int length); //implemented...

int pat_index(char *text, char *pattern);   //INDEX //implemented...

char * insert(char *text,int pos,char *string); //INSERT      //implemented...
char * delete(char *text,int pos,int length); //DELETE        //implemented...
char * replace_all(char *text,char *symbol,char *replacement); //REPLACE_ALL 

FILE * expand_macro(FILE *srcfile,char *macro,char *expansion); //REPLACE_ALL_IN_FILE		


int main(void)
{
	char str[]="this this a qw";//..for substring operations...";
	char ptr[20];	
	char *p,buff[80];
	int i;
	FILE *fp,*fpnew;
	p=ptr;
	line_splice("test.asm");
//	i=pat_index("hello is there anybody?"," is ");
//	i=pat_index("hello is there anybody?","there");
//	i=pat_index("hello is there anybody?","anybody");
	
	
//	p=replace_all(str,"this","vjkuuijtthis");
//	puts(str);
//	puts(p);
//	exit(0);	
	//puts("aa");	
	
	//p=insert(str,6,"are");
	//puts(p);
	
//	strcpy(ptr,p);
//	puts(ptr);
	
	//strcpy(ptr,insert(str,6,"are"));
	//puts("bb");
	//puts(ptr);
//	puts(str);
	
//	p=delete(ptr,4,6);
//	strcpy(ptr,p);

//	puts(p);
//	puts(ptr);
	
	
	
	//strcpy(ptr,delete(str,6,2));
	//puts(ptr);
	//strcpy(resstr,substr(str,10,8));
	//printf("%s \n",resstr);

	fp=fopen("test.asm","r");
	
	fpnew=expand_macro(fp,"MAX","MAXI");
	
	rewind(fpnew);
	while(fgets(buff,80,fpnew))
		printf("%s",buff);
	
	
	
	
	return 0;


	
}



void line_splice(char *filename)

{
	// uses join_line function recursively...
	FILE *fpsrc,*fpdest;
	char buff[80],*tempbuff;
	char tempfile[30];
	
	strcpy(tempfile,filename);
	strcat(tempfile,".pp1.tmp");
	fpsrc = fopen(filename,"r");
	fpdest = fopen(tempfile,"w" );
	while( fgets(buff,80,fpsrc) )

	{	// buff[strlen-2] points to the second last element of buff and buff[strlen-1] points to the 
		  // last..and buff[strlen] points to the terminating '\0'  
		if(buff[strlen(buff)-2] == '\\' && buff[strlen(buff)-1]=='\n' )
			
		{
			buff[strlen(buff)-2] = '\0' ;
			tempbuff=join_line(&fpsrc,buff);
			fprintf(fpdest,"%s",tempbuff);
		}
			
			/*buff[strlen(buff)-2] = '\0' ;
			strcpy(tempbuff,buff);
			fgets(buff,80,fpsrc);
			strcat(tempbuff,buff);   //joining the next two lines...
			fprintf(fpdest,"%s",tempbuff);  */


		   

		else 
			fprintf(fpdest,"%s",buff);
	


	}


	fclose(fpsrc);
	fclose(fpdest);

	

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
	char destbuff[80];
	char *deststr;
	deststr=destbuff;
	//deststr=(char *)malloc(20*sizeof(char));
	for(i=first_pos-1,j=0;i<=first_pos + length-2;i++,j++)
		*(deststr+j) = *(srcstr+i);

	*(deststr+j) = '\0' ; 
	return deststr;



}




int pat_index(char *src_str,char *substr)

{
     int i=0,j=0,k=0,retval=0;
     int len_substr , len_src_str ;
     char temp_str[10];
     len_substr = strlen(substr) ;
     len_src_str = strlen(src_str) ;
     for(i=0;i<=(len_src_str - len_substr);i++)   
     {
        for(j=0,k=i;k<i+len_substr;j++,k++)  
	{
          temp_str[j]=src_str[k] ;
        }
       temp_str[j] = '\0' ;
       if(!strcmp(temp_str,substr))
        {
													                retval=i+1; //no need.. //we have to increment i here coz arrays start with 0 but column no. in
													                break;       //a file starts with 1...
 
	}
 	else
	
	retval=0;

      }

return retval;

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
	char buff[80],newbuff[80],*newbuffptr;
	FILE *fpdest;
	newbuffptr=newbuff;
	rewind(fpsrc);
	fpdest=fopen("test.asm.pp","w+");
	while(fgets(buff,80,fpsrc))
	{
		newbuffptr=replace_all(buff,macro,expansion);
		fprintf(fpdest,"%s",newbuffptr);

	}
	fclose(fpsrc);
	return fpdest;


}


