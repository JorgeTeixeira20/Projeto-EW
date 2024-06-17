%{
#include <stdio.h>
#include "agendadata.h"

extern int yylineno;
%}

%token BAGENDA EAGENDA BENTRADA ID TIPO NOME TELEFONE EENTRADA EMAIL
%token BGRUPO EGRUPO GID BREF EREF REFENT ERROR
%start Agenda

%union{
  char *str;
  Agenda ag;
  Entrada e;
  Grupo g;
  Referencia r;
  GrupElems gelems;  
}

%type <ag> Elemento Corpo
%type <e> Entrada
%type <g> Grupo
%type <gelems> Elemento2 Corpo2
%type <r> Referencia
%type <str> ID TIPO Email EMAIL TELEFONE REFENT GID NOME
%%

Agenda : BAGENDA Corpo EAGENDA { showAgenda($2); return 0; };

Corpo : Corpo Elemento { $2->seg = $1; $$ = $2; }
      | { $$ = NULL; }
      ;

Elemento : Entrada { $$ = consAgendafromEntrada( NULL, $1 ); }
         | Grupo   { $$ = consAgendafromGrupo( NULL, $1 ); }
         ;
Entrada : BENTRADA ID TIPO NOME Email TELEFONE EENTRADA
            { $$ = consEntrada( $2, $3, $4, $5, $6 ); }; 

Email : EMAIL { $$ = $1; }
      | { $$ = NULL; }
      ;

Grupo : BGRUPO GID Corpo2 EGRUPO { $$ = consGrupo($2,$3); };

Corpo2 : Corpo2 Elemento2 { $2->seg = $1; $$ = $2; }
       | Elemento2 { $$ = $1; }
       ;

Elemento2 : Entrada { $$ = consGrupElemsfromEntrada( NULL, $1 ); }
          | Grupo { $$ = consGrupElemsfromGrupo( NULL, $1 ); }
          | Referencia { $$ = consGrupElemsfromReferencia( NULL, $1 ); }
          ;

Referencia : BREF REFENT EREF { $$ = consReferencia($2); };

%% 

int main()
{
  yyparse();
  return 0;
}

int yyerror(char *s)
{
  printf("%s near %d\n",s,yylineno);
}