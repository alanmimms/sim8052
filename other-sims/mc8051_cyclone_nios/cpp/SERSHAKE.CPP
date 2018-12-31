#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <iostream.h>
#include <dos.h>

#define PORT 0
#define SPACE 1

void init();		// Initialisierungsfunktion
void initBaud(int COM, unsigned char b);    // Initialisierung eines Ports
int readReady(int COM);         // Anliegen eines Bytes ueberpruefen
int writeReady(int COM);	// prueft serielle Sendem”glichkeit
unsigned char serWrite(unsigned char b,int COM); // Senden eines Bytes
unsigned char serRead(int COM);	// Empfangen eines Bytes

int PortAnz=0;			// Anzahl der vorhandenen Ports
unsigned int Ports[4];          // Array mit Portadressen

int main()
{
  unsigned char serinit;
  unsigned char write=0xFF;
  char c = 0;

  init();			// Suche nach vorhandenen Ports

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

  printf("'x' for exit, 'y' for prompt\n");

  while (c != 'x')
  {
     if (c == 'y')
     {
      while (!writeReady(PORT));

      putchar('#');              // disp CR flag
      write=serWrite(13, PORT);  // send CR
      if (write == 0xFF)
      {
       fprintf(stderr, "Fehler: beim Schreiben auf SER%d.\n", PORT);
       exit(-1);
      }
     }

     c=getch();
  }

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

  for (i=0;i<=4;i++)   		// max. vier Offsets = vier Ports berprfen
  {
    printf("\nPort #%i: ", i);	// aktuelle Portnummer ausgeben
    printf("%X", *(ptr+i));     // aktuelle Portadresse ausgeben
    Ports[i]=*(ptr+i);          // aktuelle Portadresse in Array schreiben
    if(Ports[i]==0) break;      // falls Portadresse = 0: kein weiterer Port
    else PortAnz++;             // falls Port vorhanden: Portanzahl erh”hen
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
    int 0x14			// endgltige intialisierung
  }
  return;			// zu main zurckspringen
}

int readReady(int COM)	// prft m”gliches, anliegendes Datenbyte
{			// -> Statusbit (Portadresse + 5), Bit 0
  unsigned char b;	// Hilfsvariable definieren
  b=inportb(Ports[COM]+5);	// in Hilfsvariable Statusbyte einlesen
  return (b&1);   	// mittels Maskierung letztes Bit zurckliefern
}

int writeReady(int COM)	// prft serielle Sendem”glichkeit
{			// -> Sendebit (Portadresse + 5), Bit 6
  unsigned char b;	// Hilfsvariable definieren
  b=inportb(Ports[COM]+5);	// in Hilfsvariable Statusbyte einlesen
  return (b&64);  	// mittels Maskierung sechstes Bit zurckliefern
}

unsigned char serWrite(unsigned char b,int COM)	// Senden eines Bytes
{
  if(writeReady(COM))	// Schreib-Bereitschaft der Schnittstelle abfragen
  {			// wenn bereit, dann:
   outportb(Ports[COM],b);	// Uebergebene Variable b auf Port schreiben
   return 0;			// bei Sendung Null zurckliefern
  }
  return 0xff;		// wenn keine Sendung, dann FF zurckliefern
}
