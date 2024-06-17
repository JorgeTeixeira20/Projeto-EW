/*
 *  agenda.c
 *  Agenda
 *
 *  Created by Jose Carlos Ramalho on 08/05/19.
 *  Copyright 2008 __MyCompanyName__. All rights reserved.
 *
 */

#include "agendadata.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

Entrada consEntrada( char *c, char *t, char *n, char *e, char *tel )
{
  Entrada aux;
  
  aux.chave = strdup(c);
  aux.tipo = strdup(t);
  aux.nome = strdup(n);
  if(e) aux.email = strdup(e); else aux.email = NULL;
  aux.telefone = strdup(tel);
  
  return aux;
}
  
  
Referencia consReferencia( char *c )
{
  Referencia aux;
  
  aux.chave = strdup(c);
  
  return aux;
}
  

Grupo consGrupo( char *c, GrupElems gelems )
{
  Grupo aux;
  
  aux.chave = strdup(c);
  aux.gelems = gelems;
  
  return aux;
}
  

GrupElems consGrupElemsfromEntrada( GrupElems gelems, Entrada e )
{
  GrupElems aux;
  
  aux = (GrupElems)malloc(sizeof(GrupElemsNodo));
  aux->tipo = ENTRADA;
  aux->gelem.e = e;
  aux->seg = gelems;
  
  return aux;
}


GrupElems consGrupElemsfromGrupo( GrupElems gelems, Grupo g )
{
  GrupElems aux;
  
  aux = (GrupElems)malloc(sizeof(GrupElemsNodo));
  aux->tipo = GRUPO;
  aux->gelem.g = g;
  aux->seg = gelems;
  
  return aux;
}


GrupElems consGrupElemsfromReferencia( GrupElems gelems, Referencia r )
{
  GrupElems aux;
  
  aux = (GrupElems)malloc(sizeof(GrupElemsNodo));
  aux->tipo = REFERENCIA;
  aux->gelem.r = r;
  aux->seg = gelems;
  
  return aux;
}

  
Agenda consAgendafromEntrada( Agenda a, Entrada e )
{
  Agenda aux;
  
  aux = (Agenda)malloc(sizeof(AgendaNodo));
  aux->tipo = ENTRADA;
  aux->aelem.e = e;
  aux->seg = a;
  
  return aux;
}

  
Agenda consAgendafromGrupo( Agenda a, Grupo g )
{
  Agenda aux;
  
  aux = (Agenda)malloc(sizeof(AgendaNodo));
  aux->tipo = GRUPO;
  aux->aelem.g = g;
  aux->seg = a;
  
  return aux;
}

void showAgenda( Agenda a)
{
  if(a)
  {
    switch(a->tipo)
	{
	  case ENTRADA: showEntrada(a->aelem.e);
					break;
	  case GRUPO: showGrupo(a->aelem.g);
	              break;
	}
	showAgenda(a->seg);
  }
}

void showEntrada( Entrada e )
{
  printf("\n%s: %s: %s\n%s: %s\n\n",e.chave,e.tipo,e.nome,e.email,e.telefone);
}

void showGrupo( Grupo g )
{
  printf("G: %s\n#####################\n", g.chave );
  showGrupElems( g.gelems );
  printf("#####################\n");
}


void showGrupElems( GrupElems gelems )
{
  if(gelems)
  {
    switch(gelems->tipo)
    {
      case ENTRADA : showEntrada(gelems->gelem.e);
                     break;
      case GRUPO   : showGrupo(gelems->gelem.g);
                     break;
      case REFERENCIA : showReferencia(gelems->gelem.r);
    }
    showGrupElems(gelems->seg);
  }
}


void showReferencia( Referencia r )
{
  printf("Ref: %s\n", r.chave );
}
