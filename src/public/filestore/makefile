gal : y.tab.o lex.yy.o alunos.o
	gcc -o gal y.tab.o lex.yy.o alunos.o -ll

alunos.o : alunos.h alunos.c
	gcc -c alunos.c

y.tab.o : y.tab.h y.tab.c
	gcc -c y.tab.c

y.tab.c y.tab.h : interp.y
	yacc -d interp.y

lex.yy.o : lex.yy.c y.tab.h
	gcc -c lex.yy.c

lex.yy.c : interp.l
	flex interp.l

