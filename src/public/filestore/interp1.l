%{
#include "y.tab.h"
%}
%option yylineno
%%
[ \t\n] ;
help return HELP;
exit return END;
load return LOAD;
save return SAVE;
add  return ADD;
show return SHOW;
count return COUNT;
list  return LIST;
ppsave return PPSAVE;
ppload return PPLOAD;
del    return DEL;

\"[^"]*\" { yytext[yyleng-1] = '\0';
	        yylval.string = strdup(yytext+1);
            return STRING; }

\;  return SEP;

.   return ERROR;
