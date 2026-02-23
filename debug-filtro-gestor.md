# Debug: Filtro por Gestor RH - CONCLUSÃO

## Dados da API
- Fabio Dias: gestorId = 1350001, lojaGestorId = 1350001 para lojas dele ✅
- Marco Amorim: gestorId = 30001, lojaGestorId = 30001 para lojas dele ✅
- Dropdown gestores.list: Fabio Dias id=1350001, Marco Amorim id=30001 ✅

## IDs coincidem!
- Dropdown value: "1350001" (string)
- gestorId nos colaboradores: 1350001 (number)
- lojaGestorId nos colaboradores: 1350001 (number)

## Filtro no frontend (linhas 428-430):
```
const matchesGestor = filterGestor === "all" ||
  (c as any).gestorId?.toString() === filterGestor ||
  (c.tipo === "loja" && (c as any).lojaGestorId?.toString() === filterGestor);
```

## TUDO PARECE CORRECTO!
Os dados estão lá, os IDs coincidem, a lógica parece correcta.

## POSSÍVEL PROBLEMA:
O tRPC com superjson pode estar a transformar os dados. O `(c as any)` pode não estar a aceder ao campo correcto.
Ou os dados no React state podem não ter o campo lojaGestorId porque o tipo TypeScript não o inclui.

## SOLUÇÃO:
Testar directamente no browser seleccionando Fabio Dias no dropdown.
