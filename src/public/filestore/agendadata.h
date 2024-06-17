/*
 *  agenda.h
 *  Agenda
 *
 *  Created by José Carlos Ramalho on 08/05/19.
 *  Copyright 2008 __MyCompanyName__. All rights reserved.
 *
 */
#ifndef _AGENDA
#define _AGENDA

typedef struct sEntrada
  {
    char *chave;
	char *tipo;
	char *nome;
	char *email;
	char *telefone;
  } Entrada;
  
Entrada consEntrada( char *c, char *t, char *n, char *e, char *tel );

void showEntrada( Entrada e );
  
typedef struct sReferencia
  {
    char *chave;
  } Referencia;
  
Referencia consReferencia( char *c );
void showReferencia( Referencia r );
  
/* -- Dummy declarations -- */
struct sGrupElems;
typedef struct sGrupElems GrupElemsNodo, *GrupElems;
/* ------------------------ */  
  
typedef struct sGrupo
  {
    char *chave;
    GrupElems gelems;
  } Grupo;
  
Grupo consGrupo( char *c, GrupElems gelems );
void showGrupo( Grupo g );
  
#define ENTRADA    1001
#define GRUPO      1002
#define REFERENCIA 1003
  
struct sGrupElems
  {
    int tipo;
	union
	  {
	    Entrada e;
            Grupo g;
	    Referencia r;
	  } gelem;
	struct sGrupElems *seg;
  };
  
GrupElems consGrupElemsfromEntrada( GrupElems gelems, Entrada e );
GrupElems consGrupElemsfromGrupo( GrupElems gelems, Grupo g );
GrupElems consGrupElemsfromReferencia( GrupElems gelems, Referencia r );
void showGrupElems( GrupElems gelems );
	
typedef struct sAgenda
  {
    int tipo;
	union
	  {
	    Entrada e;
		Grupo g;
	  } aelem;
	struct sAgenda *seg;
  } AgendaNodo, *Agenda;
  
  Agenda consAgendafromEntrada( Agenda a, Entrada e );
  Agenda consAgendafromGrupo( Agenda a, Grupo g );
  
  void showAgenda( Agenda a);

#endif