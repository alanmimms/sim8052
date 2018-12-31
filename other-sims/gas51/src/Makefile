gas51: vars.o main.o preprocessor.o pass1.o pass2.o  gas51.h
	gcc -ggdb main.o preprocessor.o  pass1.o pass2.o vars.o -o gas51
	cp gas51 ../bin

main.o: main.c gas51.h vars.c
	gcc -ggdb -c main.c 

preprocessor.o: preprocessor.c gas51.h vars.c
	gcc -ggdb -c preprocessor.c

pass1.o: pass1.c gas51.h vars.c
	gcc -ggdb -c pass1.c

pass2.o: pass2.c gas51.h vars.c
	gcc -ggdb -c pass2.c

vars.o: vars.c gas51.h
	gcc -ggdb -c vars.c

