/* ---------------------------------
   alunos.h
           2016-05-17 by jcr
   --------------------------------- */
#ifndef _ALUNOS
#define _ALUNOS

typedef struct sAluno
{
  char id[7], nome[60], curso[30];
} Aluno;

typedef struct sTurma
{
  Aluno a;
  struct sTurma *seg;
} *Turma, NodoTurma;

Turma loadAlunos();
Turma prettyLoadAlunos();
int   saveAlunos( Turma );
int prettySaveAlunos( Turma );
int   countAlunos( Turma );
Turma searchAluno( Turma, char* );
Turma addAluno( Turma, Aluno );
void  listTurma( Turma );
void  showAluno( Aluno );
Turma freeTurma( Turma );

#endif
