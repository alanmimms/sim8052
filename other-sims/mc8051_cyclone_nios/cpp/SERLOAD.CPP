#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <iostream.h>
#include <dos.h>

#define PORT 0
#define SPACE 200

void init();		// Initialisierungsfunktion
void initBaud(int COM, unsigned char b);    // Initialisierung eines Ports
int readReady(int COM);         // Anliegen eines Bytes ueberpruefen
int writeReady(int COM);	// prueft serielle Sendemîglichkeit
unsigned char serWrite(unsigned char b,int COM); // Senden eines Bytes
unsigned char serRead(int COM);	// Empfangen eines Bytes

int PortAnz=0;			// Anzahl der vorhandenen Ports
unsigned int Ports[4];          // Array mit Portadressen

int main()
{
  unsigned char read=0xFF;
  unsigned char write=0xFF;
  char hexfile[30]="d:\\file.hex";
  int prompt=0;
  int c;
  unsigned char d;
  FILE *hex;

  init();			// Suche nach vorhandenen Ports
	     // 147, 179 , 211 , 243
			// Initialisierung des zweiten Ports:
  initBaud(PORT, 147);  // Konfigurationsparameter: AL= MSB 11110011 LSB
			// entspricht: 9600 Baud, 8 - N - 1
  printf("\n\n");

  while (!kbhit() && (prompt == 0))
  {
     while(!readReady(PORT));
     read=serRead(PORT);
     if (read != 0xFF)
     {
       printf("%c", read);   // PROMPT OK
       if (read == 0x3D)
	prompt = 1;
     }
  }

  printf("\n");

  hex = fopen(hexfile, "r");
  if ((hex)  && (prompt == 1))   // DOWNLOAD
  {
//    printf("Taste druecken, um Download zu starten.\n");
//    getch();

    do
    {
     delay(SPACE);

     c = fgetc(hex);
     if (c != EOF)
     {

      if (c == 10)
	printf("\n");
      else
	putch(c);


      d = (unsigned char) c;

      while (!writeReady(PORT));

      write=serWrite(d, PORT);
      if (write == 0xFF)
      {
       fprintf(stderr, "Fehler: beim Schreiben auf SER%d.\n", PORT);
       break;
      }
     }
    } while (c != EOF);
  }
  else
   fprintf(stderr, "Fehler: HexFile nicht geoeffnet, kein Prompt.\n");

  fclose(hex);

 // getch();
//  printf("Download complete, Ende mit 'e'.\n");

  delay(100);

  while (!kbhit())
  {
     while(!readReady(PORT));
     read=serRead(PORT);
     if (read != 0xFF)
     {
       printf("%c", read);
       if (read == ':')
       { printf("\n Senden der RAM-Base (2000h).\n");


      while (!writeReady(PORT));
	 write=serWrite('/', PORT);
	 delay(100);
      while (!writeReady(PORT));
	 write=serWrite('2', PORT);
	 delay(100);
      while (!writeReady(PORT));
	 write=serWrite('0', PORT);
	 delay(100);
      while (!writeReady(PORT));
	 write=serWrite('0', PORT);
	 delay(100);
      while (!writeReady(PORT));
	 write=serWrite('0', PORT);
	 delay(100);
      while (!writeReady(PORT));
	 write=serWrite(13, PORT);
       }
     }
  }

  getch();
  return 0;
}

unsigned char serRead(int COM)	// Empfangen eines Bytes
{
  unsigned char c;

  if(readReady(COM))	// Lese-Bereitschaft der Schnittstelle abfragen
  {			// wenn bereit, dann:
   c=inportb(Ports[COM]);
   return c;
  }
  return 0xff;
}

void init()			// Initialisierungsfunktion
{
  unsigned int far* ptr;	// Far-Pointer, der auf Adresse im BIOS zeigt
  int i;			// Laufvariable, gibt den Offset an

  ptr=(unsigned int far *)MK_FP(0x0040,0);
  // der Variable ptr wird folgendes Makro zugewiesen:
  // "make farpointer mit Adresse 0x0040, Offset 0"

  for (i=0;i<=4;i++)   		// max. vier Offsets = vier Ports ÅberprÅfen
  {
    printf("\nPort #%i: ", i);	// aktuelle Portnummer ausgeben
    printf("%X", *(ptr+i));     // aktuelle Portadresse ausgeben
    Ports[i]=*(ptr+i);          // aktuelle Portadresse in Array schreiben
    if(Ports[i]==0) break;      // falls Portadresse = 0: kein weiterer Port
    else PortAnz++;             // falls Port vorhanden: Portanzahl erhîhen
  }
  //printf("\nAnzahl der Ports #%i: ", PortAnz);
  cout << endl << "Anzahl der Ports: " << PortAnz << endl;
  return;			// zu main zurueckspringen
}

void initBaud(int COM, unsigned char b)	// Initialisierung der Schnittstelle
{
  asm{
    mov AH,0x0                  // AH muss nullgesetzt werden (Daten bereit)
    mov DX,COM			// Nummer der ser. Schnittstelle in DX
    mov AL,b			// Konfigurationsparameter in AL
    int 0x14			// endgÅltige intialisierung
  }
  return;			// zu main zurÅckspringen
}

int readReady(int COM)	// prÅft mîgliches, anliegendes Datenbyte
{			// -> Statusbit (Portadresse + 5), Bit 0
  unsigned char b;	// Hilfsvariable definieren
  b=inportb(Ports[COM]+5);	// in Hilfsvariable Statusbyte einlesen
  return (b&1);   	// mittels Maskierung letztes Bit zurÅckliefern
}

int writeReady(int COM)	// prÅft serielle Sendemîglichkeit
{			// -> Sendebit (Portadresse + 5), Bit 6
  unsigned char b;	// Hilfsvariable definieren
  b=inportb(Ports[COM]+5);	// in Hilfsvariable Statusbyte einlesen
  return (b&64);  	// mittels Maskierung sechstes Bit zurÅckliefern
}

unsigned char serWrite(unsigned char b,int COM)	// Senden eines Bytes
{
  if(writeReady(COM))	// Schreib-Bereitschaft der Schnittstelle abfragen
  {			// wenn bereit, dann:
   outportb(Ports[COM],b);	// Uebergebene Variable b auf Port schreiben
   return 0;			// bei Sendung Null zurÅckliefern
  }
  return 0xff;		// wenn keine Sendung, dann FF zurÅckliefern
}
