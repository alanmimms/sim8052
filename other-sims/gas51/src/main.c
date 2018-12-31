#include"gas51.h"

void convert2hex(FILE *,char  *);

extern void dump_file(FILE *);
extern FILE *pass1(FILE *);
extern FILE *pass2(FILE *);
int main()
//int main(int argc,char **argv)
{
	FILE *fp,*fp2,*fp3;
	//printf("Inside main.c...");
	
	strcpy(gas51_file_being_assembled,"test4.asm") ;  // replace test.asm with argv later...
	fp=preprocess("test4.asm");  // preprocess returns pointer to preprocessed file...
	
	fp2=pass1(fp);   //getting pointer for the next pass of assembler...
	fp3=pass2(fp2);
	convert2hex(fp3,"test4.hex");

}


void convert2hex(FILE *fpraw,char *filename)
{
	
	unsigned char cdata1,cdata2,inbuff[80],outbuff[80],line[80];
	unsigned char saddr2[6],saddr1[6],saddr[6];
	unsigned char sdata2[4],sdata1[4],cksum,type=0;

	unsigned int iaddr2,iaddr1,iaddr;
//	unsigned char cdata2,cdata1;		
	FILE * fphexfile;
	unsigned  char count=1,acc=0;

	fphexfile = fopen(filename,"w");
	rewind(fpraw);
//	fphexfile=tmpfile();   //dump_file() function works only on temporary files created with tmpfile(); ;-)
	strcpy(outbuff, "\0");
//	while(1)
//	{
	
		 if(fscanf(fpraw,"%s %s",saddr1,sdata1)!=EOF )
 {			 
			  
		 
		
		
		
	while(1)
	{	
		
		
		
		 //strcat(outbuff,saddr1);
		 strcpy(saddr,saddr1);
		 sscanf(saddr,"%X",&iaddr);
		 
		 strcat(outbuff,sdata1);
		 sscanf(sdata1,"%X",&cdata1);
		 acc = acc + cdata1 ;

		 
		 if(fscanf(fpraw,"%s %s",saddr2,sdata2)==EOF )
			 break ;

		 
		 sscanf(saddr1,"%X",&iaddr1);
		 sscanf(saddr2,"%X",&iaddr2);
		 acc = acc+ (iaddr/0x100) + (iaddr%0x100) ;  //adding the 4-byte address as two 2-byte values...
		 
		 while(  (iaddr2-iaddr1)==1  && (count < 16)  )
		 {
			//fscanf(fpraw,"%s %s",saddr2,sdata2);
		 	strcat(outbuff,sdata2);
			sscanf(sdata2,"%X",&cdata2);
		 	count++;
			
			acc = acc + cdata2 ;
			iaddr1 = iaddr2 ;
			fscanf(fpraw,"%s %s",saddr2,sdata2);
			sscanf(saddr2,"%X",&iaddr2);  // need to convert sdata2 into hex,it will be used to calculate checksum...
			//sscanf(sdata2,"%X",&cdata2);
			//acc = acc + cdata2 ;


			
		 }
		 
		 		 
		 	 
		 	 acc = acc + count + 0;    //adding count of bytes and record type which is incidentally ZERO...
			 cksum = ~acc + 1 ;  //taking the 2's complement of the sum gives its cksum...
			 fprintf(fphexfile,":%.2X%s%.2X%s%.2X\n",count,saddr,type,outbuff,cksum);
			 strcpy(outbuff,"\0") ;
			 count=1;
			 acc = 0;		
			 strcpy(saddr1,saddr2);	 
			 strcpy(sdata1,sdata2);
			 
			 
			 
			 //	 continue;
		 
		 		 
	/*	 sprintf(outbuff,"%.4X",addr);
		 
		 fscanf(fprawfile,"%4X %2X",&addr,&data);
		 
		 while(addr <= start_addr+15 )
		 {
			 
			





		 }	 */
	

		
	
	}



 }	


		// else
		//	 exit(1);
		 

		
		
fprintf(fphexfile,":00000001FF\n");   //commno ending line in the hex file...
//dump_file(fphexfile);
fclose(fphexfile);
fclose(fpraw);


}


unsigned char calc_cksum(char *line)
{

	



	

}




















