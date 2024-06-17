%{
#include "arvbin.h"
#include "y.tab.h"
%}

%%
\(  return '(';
\)  return ')';

[0-9]+  { yylval.valor = atoi(yytext);
          return num; }

[ \t\n] ;

<<EOF>>  return '$';
