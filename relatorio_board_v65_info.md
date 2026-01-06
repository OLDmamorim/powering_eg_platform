# Melhorias Relatório Board v6.5

## Funcionalidades Implementadas

### 1. Botão "Gerar Relatório IA para Board"
- Adicionado botão idêntico ao da página Categorias
- Usa exatamente o mesmo componente `RelatorioIACategorias`
- Gera o mesmo relatório IA estruturado

### 2. Histórico de Relatórios IA
- Adicionado componente `HistoricoRelatoriosIA` na página Relatório Board
- Mostra todos os relatórios gerados com data, hora e autor
- Permite visualizar relatórios anteriores

### 3. Categorias "A Acompanhar" no Relatório
- O relatório IA agora inclui uma secção prioritária "ASSUNTOS PRIORITÁRIOS PARA DISCUSSÃO NO BOARD"
- Lista todas as categorias com status "A Acompanhar" (não resolvidos)
- Inclui: Stocks, Recursos Humanos, Famalicão (conforme dados atuais)
- Categorias com status "Em Tratamento" ou "Tratado" NÃO aparecem nesta secção

### 4. Estrutura do Relatório
- Secção prioritária no início do relatório
- Para cada categoria a acompanhar:
  - Nome da categoria
  - Número de relatórios a acompanhar
  - Lista dos assuntos/problemas específicos
  - Lojas afetadas
  - Recomendação de ação urgente

## Ficheiros Modificados
- `server/relatorioCategoriasService.ts` - Adicionada secção de categorias a acompanhar no prompt da IA
- `client/src/pages/RelatorioBoard.tsx` - Adicionado botão, histórico e modal

## Verificação
- O relatório gerado mostra corretamente:
  - Recursos Humanos (1 relatório a acompanhar)
  - Stocks (1 relatório a acompanhar)
  - Famalicão (Operacional) (1 relatório a acompanhar)
