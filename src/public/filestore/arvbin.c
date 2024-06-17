/* ----
   arvbin.c
   ---- */

#include <stdio.h>
#include <stdlib.h>
#include "arvbin.h"

ArvBin consABin( int v, ArvBin e, ArvBin d )
{
  ArvBin res;

  res = (ArvBin) malloc(sizeof(NodoArvBin));
  res->valor = v;
  res->esq = e;
  res->dir = d;

  return res;
}

int verificaABin( ArvBin a )
{
  if(!a) return 1;
  else
    return 0;
}

void invinorder( ArvBin a )
{
  if(a)
  {
    invinorder( a->dir );
    printf(" %d ", a->valor );
    invinorder( a->esq );
  }
}

int somaABin( ArvBin a )
{
  return a?(a->valor+somaABin(a->esq)+somaABin(a->dir)):0 ;
}

int contaABin( ArvBin a )
{
  return a?(1+contaABin(a->esq)+contaABin(a->dir)):0 ;
}