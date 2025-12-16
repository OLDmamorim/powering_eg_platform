# Sugestões de Melhorias Estruturais
## PoweringEG Platform v3.3

**Autor:** Manus AI  
**Data:** 16 de Dezembro de 2025

---

## Sumário Executivo

Após uma análise detalhada da estrutura atual do projeto PoweringEG Platform, foram identificadas diversas oportunidades de melhoria que podem aumentar a manutenibilidade, escalabilidade e robustez da aplicação. Este documento apresenta recomendações organizadas por área, com prioridade e impacto estimado para cada sugestão.

---

## 1. Arquitetura de Código

### 1.1 Modularização do Ficheiro de Routers

O ficheiro `server/routers.ts` contém atualmente **684 linhas** de código, concentrando toda a lógica de API num único ficheiro. Esta abordagem dificulta a manutenção e aumenta o risco de conflitos em desenvolvimento colaborativo.

**Recomendação:** Dividir o router em módulos separados por domínio funcional.

| Módulo Proposto | Responsabilidade | Linhas Estimadas |
|-----------------|------------------|------------------|
| `routers/lojas.ts` | CRUD de lojas | ~50 |
| `routers/gestores.ts` | CRUD de gestores e promoções | ~70 |
| `routers/relatoriosLivres.ts` | Gestão de relatórios livres | ~120 |
| `routers/relatoriosCompletos.ts` | Gestão de relatórios completos | ~150 |
| `routers/pendentes.ts` | Gestão de pendentes | ~80 |
| `routers/alertas.ts` | Sistema de alertas | ~100 |
| `routers/ia.ts` | Funcionalidades de IA | ~80 |
| `routers/index.ts` | Agregador de routers | ~30 |

**Impacto:** Alto | **Prioridade:** Alta | **Esforço:** Médio

### 1.2 Modularização do Ficheiro de Base de Dados

O ficheiro `server/db.ts` possui **1118 linhas**, contendo todas as funções de acesso à base de dados. Recomenda-se a separação por entidade.

**Estrutura Proposta:**
```
server/
  db/
    index.ts          # Exportações agregadas
    connection.ts     # Gestão de conexão
    lojas.ts          # Operações de lojas
    gestores.ts       # Operações de gestores
    relatorios.ts     # Operações de relatórios
    pendentes.ts      # Operações de pendentes
    alertas.ts        # Operações de alertas
```

**Impacto:** Alto | **Prioridade:** Alta | **Esforço:** Médio

### 1.3 Refatoração de Páginas Extensas

Várias páginas do frontend excedem 500 linhas, tornando-se difíceis de manter:

| Página | Linhas | Recomendação |
|--------|--------|--------------|
| `Relatorios.tsx` | 1035 | Extrair componentes: `RelatorioCard`, `FiltrosRelatorios`, `ModalEdicao` |
| `RelatorioCompleto.tsx` | 626 | Extrair cada secção do formulário como componente separado |
| `RelatoriosIA.tsx` | 624 | Extrair `RelatorioIACard`, `GraficoEvolucao`, `ExportadorPDF` |
| `HistoricoPontos.tsx` | 592 | Extrair `TimelinePontos`, `ComparacaoLojas`, `FiltrosPeriodo` |
| `Dashboard.tsx` | 511 | Extrair `MetricCard`, `GraficoVisitas`, `AtividadeRecente` |

**Impacto:** Médio | **Prioridade:** Média | **Esforço:** Médio

---

## 2. Base de Dados

### 2.1 Implementação de Foreign Keys

Atualmente, as relações entre tabelas não têm constraints de foreign key definidas no schema, o que pode levar a inconsistências de dados.

**Recomendação:** Adicionar foreign keys explícitas no schema Drizzle:

```typescript
// Exemplo para gestores
export const gestores = mysqlTable("gestores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: 'cascade' }),
  // ...
});
```

**Tabelas Afetadas:**
- `gestores.userId` → `users.id`
- `gestorLojas.gestorId` → `gestores.id`
- `gestorLojas.lojaId` → `lojas.id`
- `relatoriosLivres.gestorId` → `gestores.id`
- `relatoriosLivres.lojaId` → `lojas.id`
- `relatoriosCompletos.gestorId` → `gestores.id`
- `relatoriosCompletos.lojaId` → `lojas.id`
- `pendentes.lojaId` → `lojas.id`
- `alertas.lojaId` → `lojas.id`

**Impacto:** Alto | **Prioridade:** Alta | **Esforço:** Baixo

### 2.2 Índices para Otimização de Queries

Adicionar índices nas colunas frequentemente utilizadas em filtros e ordenações:

| Tabela | Coluna(s) | Tipo de Índice |
|--------|-----------|----------------|
| `relatorios_livres` | `dataVisita` | INDEX |
| `relatorios_livres` | `gestorId, lojaId` | COMPOSITE INDEX |
| `relatorios_completos` | `dataVisita` | INDEX |
| `pendentes` | `lojaId, resolvido` | COMPOSITE INDEX |
| `alertas` | `lojaId, estado` | COMPOSITE INDEX |
| `users` | `email` | UNIQUE INDEX |

**Impacto:** Médio | **Prioridade:** Média | **Esforço:** Baixo

### 2.3 Tabela de Auditoria

Criar uma tabela para registar alterações importantes no sistema:

```typescript
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  acao: varchar("acao", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE
  entidade: varchar("entidade", { length: 50 }).notNull(), // gestor, loja, relatorio
  entidadeId: int("entidadeId"),
  dadosAnteriores: text("dadosAnteriores"), // JSON
  dadosNovos: text("dadosNovos"), // JSON
  ip: varchar("ip", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Impacto:** Médio | **Prioridade:** Baixa | **Esforço:** Médio

---

## 3. Segurança

### 3.1 Validação de Dados Reforçada

Implementar validações mais robustas nos inputs usando Zod com mensagens personalizadas em português:

```typescript
const gestorSchema = z.object({
  nome: z.string()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(100, "O nome não pode exceder 100 caracteres"),
  email: z.string()
    .email("Formato de email inválido")
    .max(320, "Email demasiado longo"),
});
```

**Impacto:** Médio | **Prioridade:** Média | **Esforço:** Baixo

### 3.2 Rate Limiting

Implementar limitação de taxa para prevenir abusos, especialmente em endpoints sensíveis:

| Endpoint | Limite Sugerido |
|----------|-----------------|
| Login/OAuth | 5 tentativas/minuto |
| Criação de relatórios | 10/minuto |
| Envio de emails | 5/minuto |
| Geração de IA | 3/minuto |

**Impacto:** Alto | **Prioridade:** Alta | **Esforço:** Médio

### 3.3 Sanitização de Conteúdo HTML

Os campos de texto livre (descrições, observações) devem ser sanitizados antes de serem renderizados para prevenir XSS:

```typescript
import DOMPurify from 'dompurify';
const sanitizedContent = DOMPurify.sanitize(userInput);
```

**Impacto:** Alto | **Prioridade:** Alta | **Esforço:** Baixo

---

## 4. Performance

### 4.1 Paginação de Listas

Implementar paginação server-side para listas que podem crescer significativamente:

| Lista | Registos Esperados | Paginação Recomendada |
|-------|-------------------|----------------------|
| Relatórios | 1000+ por ano | 20 por página |
| Pendentes | 500+ | 25 por página |
| Alertas | 200+ | 15 por página |
| Histórico de Pontos | 2000+ | 50 por página |

**Impacto:** Alto | **Prioridade:** Média | **Esforço:** Médio

### 4.2 Cache de Dados Estáticos

Implementar cache para dados que mudam raramente:

- Lista de lojas (cache de 5 minutos)
- Lista de gestores (cache de 5 minutos)
- Configurações de alertas (cache de 10 minutos)

**Impacto:** Médio | **Prioridade:** Baixa | **Esforço:** Médio

### 4.3 Lazy Loading de Componentes

Implementar code splitting para páginas menos utilizadas:

```typescript
const RelatoriosIA = lazy(() => import('./pages/RelatoriosIA'));
const HistoricoPontos = lazy(() => import('./pages/HistoricoPontos'));
const ConfiguracoesAlertas = lazy(() => import('./pages/ConfiguracoesAlertas'));
```

**Impacto:** Médio | **Prioridade:** Baixa | **Esforço:** Baixo

---

## 5. Testes

### 5.1 Cobertura de Testes

Atualmente existem apenas **3 ficheiros de teste**. Recomenda-se expandir a cobertura:

| Área | Testes Existentes | Testes Recomendados |
|------|-------------------|---------------------|
| Autenticação | 1 | 5 (login, logout, roles, sessões) |
| Gestores | 2 | 6 (CRUD completo, associações) |
| Lojas | 0 | 5 (CRUD completo) |
| Relatórios | 0 | 8 (criação, edição, filtros, email) |
| Pendentes | 0 | 4 (CRUD, resolução) |
| Alertas | 0 | 5 (criação automática, resolução) |
| IA | 0 | 3 (geração de relatórios, dicas) |

**Meta:** Atingir 70% de cobertura de código.

**Impacto:** Alto | **Prioridade:** Alta | **Esforço:** Alto

### 5.2 Testes End-to-End

Implementar testes E2E com Playwright para fluxos críticos:

1. Login e navegação
2. Criação de relatório livre completo
3. Criação de relatório completo multi-página
4. Gestão de pendentes
5. Visualização de dashboard

**Impacto:** Alto | **Prioridade:** Média | **Esforço:** Alto

---

## 6. Experiência do Utilizador

### 6.1 Sistema de Notificações Push

Implementar notificações em tempo real usando WebSockets ou Server-Sent Events:

- Novos relatórios criados (para admin)
- Alertas gerados
- Pendentes resolvidos

**Impacto:** Alto | **Prioridade:** Média | **Esforço:** Alto

### 6.2 Modo Offline

Implementar funcionalidade offline para gestores em campo:

- Cache local de lojas atribuídas
- Formulários de relatório offline
- Sincronização automática quando online

**Impacto:** Alto | **Prioridade:** Baixa | **Esforço:** Alto

### 6.3 Exportação de Dados

Adicionar funcionalidades de exportação:

| Formato | Dados | Prioridade |
|---------|-------|------------|
| Excel | Relatórios, Pendentes, Estatísticas | Alta |
| CSV | Todos os dados | Média |
| PDF | Relatórios individuais (já existe) | Existente |

**Impacto:** Médio | **Prioridade:** Média | **Esforço:** Médio

---

## 7. DevOps e Manutenção

### 7.1 Logging Estruturado

Implementar logging estruturado com níveis e contexto:

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Uso
logger.info({ userId, action: 'create_relatorio', lojaId }, 'Relatório criado');
```

**Impacto:** Médio | **Prioridade:** Média | **Esforço:** Baixo

### 7.2 Health Checks

Adicionar endpoints de health check para monitorização:

```typescript
// GET /api/health
{
  status: 'healthy',
  database: 'connected',
  uptime: 3600,
  version: '3.3.0'
}
```

**Impacto:** Médio | **Prioridade:** Alta | **Esforço:** Baixo

### 7.3 Documentação de API

Gerar documentação automática da API usando OpenAPI/Swagger através do tRPC:

```typescript
import { generateOpenApiDocument } from 'trpc-openapi';

const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'PoweringEG API',
  version: '3.3.0',
  baseUrl: 'https://api.poweringeg.com',
});
```

**Impacto:** Médio | **Prioridade:** Baixa | **Esforço:** Médio

---

## 8. Roadmap de Implementação

### Fase 1 - Fundações (2-3 semanas)
1. Implementar foreign keys na base de dados
2. Adicionar índices de performance
3. Implementar rate limiting
4. Sanitização de conteúdo

### Fase 2 - Modularização (3-4 semanas)
1. Dividir routers.ts em módulos
2. Dividir db.ts em módulos
3. Extrair componentes das páginas maiores

### Fase 3 - Qualidade (2-3 semanas)
1. Expandir cobertura de testes unitários
2. Implementar testes E2E básicos
3. Adicionar logging estruturado

### Fase 4 - Funcionalidades (4-6 semanas)
1. Paginação de listas
2. Exportação para Excel
3. Tabela de auditoria
4. Health checks

### Fase 5 - Avançado (6-8 semanas)
1. Notificações push em tempo real
2. Modo offline para gestores
3. Documentação de API

---

## Resumo de Prioridades

| Prioridade | Melhorias |
|------------|-----------|
| **Alta** | Foreign keys, Rate limiting, Sanitização, Modularização de routers e db, Testes |
| **Média** | Índices, Validação, Paginação, Refatoração de páginas, Exportação Excel |
| **Baixa** | Cache, Lazy loading, Auditoria, Modo offline, Documentação API |

---

## Conclusão

O PoweringEG Platform possui uma base sólida com funcionalidades bem implementadas. As melhorias sugeridas neste documento visam preparar a aplicação para crescimento sustentável, melhorar a experiência de desenvolvimento e garantir a robustez do sistema em produção. Recomenda-se começar pelas melhorias de alta prioridade, que oferecem o melhor retorno sobre o investimento de tempo e esforço.

---

*Documento gerado automaticamente por Manus AI*
