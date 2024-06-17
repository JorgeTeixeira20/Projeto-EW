%{
#include <stdio.h>
#include <stdlib.h>
#include "arvbin.h"
#define YYERROR_VERBOSE
%}

%token num
%union{
  int valor;
  ArvBin arv;
}

%type <valor> num
%type <arv> ABin
%start Parv
%%

Parv : ABin  '$' 
     { printf("\nABIN: %d\n", verificaABin( $1 ));
       invinorder( $1 );
       printf("\nSoma: %d\n", somaABin( $1 ));
       printf("\nElementos: %d\n", contaABin( $1 )); 
       return 0; 
     } ;

ABin : '(' ')' { $$ = NULL; }
     | '(' num ABin ABin ')' { $$ = consABin( $2, $3, $4 ); }
     ;

%%
int main()
{
  yyparse();
}

int yyerror( char *s )
{
  fprintf(stderr, "%s", s);
}
