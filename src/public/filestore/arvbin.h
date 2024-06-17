/* ----
   arvbin.h
   ---- */
#ifndef _ARVBIN
#define _ARVBIN

typedef struct sArvBin
  {
    int valor;
    struct sArvBin *esq, *dir;
  }
    *ArvBin, NodoArvBin;

ArvBin consABin( int, ArvBin, ArvBin );
int verificaABin( ArvBin );
void invinorder( ArvBin );
int somaABin( ArvBin );
int contaABin( ArvBin );
#endif