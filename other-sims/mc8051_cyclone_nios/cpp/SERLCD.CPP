#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <iostream.h>
#include <dos.h>

#define PORT 0
#define SPACE 1

void dispMenu();         // Selektionsmenue
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
  unsigned char serinit;
  unsigned char write=0xFF;
  char c = 0;
  char cmd = 0;

  init();			// Suche nach vorhandenen Ports
/*
  printf("select baud rate: 'a' -> 2400, 'b' -> 4800, 'c' -> 9600\n");

  while (!(c == 'a' || c == 'b' || c == 'c'))
    c=getch();

  switch (c)   // set baud rate init string
  {
    case 'a': { serinit = 179; break; }
    case 'b': { serinit = 211; break; }
    case 'c': { serinit = 243; break; }
    default:  { serinit = 211; break; }
  }

  initBaud(PORT, serinit);  // init ser port
*/
  initBaud(PORT, 211);  // init ser port: 4k8 baud, 8N1

  while (cmd != 'x')
  {
   dispMenu();      // get new cmd
   cmd = getche();

   if (cmd == 'e')  // mode: enter text
   {
    printf("\n\nESC for abort\n");

    do
    {
     c=getche();

     while (!writeReady(PORT));  // wait for ser port

     write=serWrite(c, PORT);    // send char
     if (write == 0xFF)
     {
      fprintf(stderr, "Fehler: beim Schreiben auf SER%d.\n", PORT);
      exit(-1);
     }
    } while(c != 27);
   }
   else if (cmd != 'x')         // cmd modes
   {
     while (!writeReady(PORT));     // wait for ser port
     write=serWrite(0xFE, PORT);    // send cmd mode byte
     if (write == 0xFF)
     {
      fprintf(stderr, "Fehler: beim Schreiben auf SER%d.\n", PORT);
      exit(-1);
     }

     delay(100);

     while (!writeReady(PORT));     // wait for ser port

     switch (cmd)
     {
       case 'c': { write=serWrite(0x01, PORT); break; } // clr cmd
       case 'h': { write=serWrite(0x02, PORT); break; } // home cmd
       case 'f': { write=serWrite(0x08, PORT); break; } // lcd off cmd
       case 'n': { write=serWrite(0x0C, PORT); break; } // lcd on cmd
       case 's': { write=serWrite(0x0E, PORT); break; } // cur sml cmd
       case 'b': { write=serWrite(0x0F, PORT); break; } // cur big cmd
       case 'L': { write=serWrite(0x07, PORT); break; } // shift left cmd
       case 'R': { write=serWrite(0x05, PORT); break; } // shift right cmd
       case 'l': { write=serWrite(0x06, PORT); break; } // no shift left cmd
       case 'r': { write=serWrite(0x04, PORT); break; } // no shift right cmd
       default:  { ; }
     }

     if (write == 0xFF)
     {
      fprintf(stderr, "Fehler: beim Schreiben auf SER%d.\n", PORT);
      exit(-1);
     }
   }
  }
  return 0;
}

void dispMenu()
{
   printf("\n\n\te ... enter text\n");
   printf("\tc ... clear LCD screen\n");
   printf("\tf ... turn off LCD\n");
   printf("\tn ... turn on LCD\n");
   printf("\ts ... small LCD cursor\n");
   printf("\tb ... big LCD cursor\n");
   printf("\tL ... shift left characters\n");
   printf("\tR ... shift right characters\n");
   printf("\tl ... write left characters\n");
   printf("\tr ... write right characters\n");
   printf("\tx ... exit\n\n");
   printf("\tyour choice: ");
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
