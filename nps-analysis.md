# Análise Ficheiro NPS2026.xlsx - Folha "Por Loja"

## Estrutura:
- Linhas 1-8: Vazias / Título
- Linha 6: Título "NPS - Net Promoter Score | Análise por Loja"
- Linha 9: "Rótulos de Coluna"
- Linha 10: "NPS" (cols C-N) | "% Respostas" (cols P+)
- Linha 11: "2026" | "2026 Total" | "2026"
- Linha 12: CABEÇALHOS → col B="Loja", cols C-N = "jan","fev","mar"..."dez", col O = vazio (2026 Total), cols P+ = "jan","fev"... (% Respostas)
- Linha 13+: Dados (col B = nome da loja, cols C-N = NPS mensal, cols P+ = % Respostas mensal)

## Problema:
- O cabeçalho "Loja" está na coluna B (índice 1), linha 12
- Os dados começam na linha 13
- O código actual provavelmente procura "Loja" na linha 1 ou na coluna A
