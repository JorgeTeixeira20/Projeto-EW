%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "alunos.h"
extern int yylex();
extern int yylineno;
extern char *yytext;
void yyerror(char*);
void help();
Turma myclass = NULL, aux = NULL;
%}
%token END SEP LOAD SAVE ADD SHOW COUNT STRING ERROR LIST HELP PPSAVE PPLOAD DEL
%union{
  char *string;
}

%type <string> STRING

%start Interp

%%
Interp : ComList END { return 0; } ;

ComList : Command SEP ComList
        | 
        ;

Command : LOAD { myclass = loadAlunos();
                 printf("\nForam carregados %d alunos.\n>>", countAlunos(myclass)); }
        | PPLOAD  { myclass = prettyLoadAlunos();
                    printf("\nForam carregados %d alunos.\n>>", countAlunos(myclass)); }
        | SAVE { int i = saveAlunos(myclass); 
                 printf("Foram guardados %d alunos.\n>>", i); }
        | PPSAVE  { int i = prettySaveAlunos(myclass); 
                    printf("Foram guardados %d alunos.\n>>", i); }
        | ADD STRING STRING STRING
               { Aluno a;
                 strcpy( a.id, $2 );
                 strcpy( a.nome, $3 );
                 strcpy( a.curso, $4);
                 myclass = addAluno( myclass, a );
                 printf("Foi adicionado o aluno: %s\n>>", $3); }
        | SHOW STRING
                {
                  printf("\nProcurando por %s...\n", $2);
                  if((aux = searchAluno(myclass, $2)))
                    showAluno(aux->a);
                  printf("\n>>");
                }
        | LIST { listTurma(myclass); printf("\n>>"); }
        | COUNT { printf("\nHa %d alunos na turma.\n", countAlunos(myclass)); } 
        | HELP { help(); }
        | DEL { myclass = freeTurma(myclass);
                if(!myclass) printf("\nTurma apagada com sucesso.\n>>");}
        ;

%%
void help()
{
  printf("\nComandos disponiveis:\n");
  printf("\thelp :imprime esta mensagem;\n");
  printf("\tload :carrega alunos do ficheiro binario ALUNOS.DAT;\n");
  printf("\tppload :carrega alunos do ficheiro de texto ALUNOS.TXT;\n");
  printf("\tsave :guarda os alunos no ficheiro binario ALUNOS.DAT;\n");
  printf("\tppsave :guarda os alunos no ficheiro de texto ALUNOS.TXT;\n");
  printf("\tlist :lista os alunos;\n");
  printf("\tcount :diz-nos quantos alunos estao armazenados;\n");
  printf("\tadd <string> <string> <string> :adiciona um aluno;\n");
  printf("\tshow <string> :procura e lista o aluno com id igual a <string>;");
  printf("\tdel :destroi/apaga a turma corrente;");
  printf("\texit :sai do programa.");
  printf("\t<string> :literal dentro de aspas;\n");
}

void yyerror(char *s)
{ 
  fprintf(stderr, "ERRO: %d: %s: %s\n", yylineno, s, yytext);
}

int main() 
{
    printf("Se precisar de ajuda digite: help;\n>>");
    if(yyparse()==0) 
      printf("\nThat's the end Folks!\n"); 
    else
      printf("\n Ocorreram erros durante a Analise!!!!\n");

    return 0;
}