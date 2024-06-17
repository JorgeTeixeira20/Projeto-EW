%{
#include "agendadata.h"
#include "y.tab.h"
#include <string.h>
#include <stdlib.h>
%}

%option yylineno

%%
\<AGENDA\>      return BAGENDA;
\<\/AGENDA\>    return EAGENDA;
\<ENTRADA       return BENTRADA;

id\=\"[^"]*\"   { yylval.str = strdup(yytext+4);
                  yylval.str[strlen(yytext)-5] = '\0'; return ID;}

tipo\=\"[^"]*\"  { yylval.str = strdup(yytext+6);
                  yylval.str[strlen(yytext)-7] = '\0'; return TIPO;}

\<NOME\>([^<]|[\n])*\<\/NOME\>  { yylval.str = strdup(yytext+6);
                                  yylval.str[strlen(yytext)-13] = '\0'; 
                                  return NOME;}

\<TELEFONE\>([^<]|[\n])*\<\/TELEFONE\>  { yylval.str = strdup(yytext+10);
                                          yylval.str[strlen(yytext)-21] = '\0';
                                          return TELEFONE;}

\<EMAIL\>([^<]|[\n])*\<\/EMAIL\>  { yylval.str = strdup(yytext+7);
                                    yylval.str[strlen(yytext)-15] = '\0'; 
                                    return EMAIL;}

\<\/ENTRADA\>   return EENTRADA;
\<GRUPO         return BGRUPO;

gid\=\"[^"]*\"  { yylval.str = strdup(yytext+5);
                  yylval.str[strlen(yytext)-6] = '\0'; 
                  return GID;}

\<\/GRUPO\>     return EGRUPO;
\<REFERENCIA    return BREF;

refent\=\"[^"]*\"  { yylval.str = strdup(yytext+8);
                     yylval.str[strlen(yytext)-9] = '\0'; 
                     return REFENT;}

\/\>            return EREF;
[> \t\n]        ;
.               return ERROR;
%%
int yywrap()
{}