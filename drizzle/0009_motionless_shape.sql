CREATE TABLE `atividades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int,
	`lojaId` int,
	`tipo` enum('visita_realizada','relatorio_livre','relatorio_completo','pendente_criado','pendente_resolvido','alerta_gerado','alerta_resolvido','gestor_criado','loja_criada') NOT NULL,
	`descricao` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `atividades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planos_visitas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`semanaInicio` timestamp NOT NULL,
	`semanaFim` timestamp NOT NULL,
	`visitasSugeridas` text NOT NULL,
	`estado` enum('pendente','aceite','modificado','rejeitado') NOT NULL DEFAULT 'pendente',
	`visitasRealizadas` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planos_visitas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `previsoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`tipo` enum('risco_pendentes','padrao_negativo','sem_visita_prolongada','tendencia_problemas') NOT NULL,
	`descricao` text NOT NULL,
	`probabilidade` int,
	`sugestaoAcao` text,
	`estado` enum('ativa','confirmada','descartada') NOT NULL DEFAULT 'ativa',
	`validaAte` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `previsoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sugestoes_melhoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`relatorioId` int NOT NULL,
	`tipoRelatorio` enum('livre','completo') NOT NULL,
	`lojaId` int NOT NULL,
	`gestorId` int NOT NULL,
	`sugestao` text NOT NULL,
	`categoria` enum('stock','epis','limpeza','atendimento','documentacao','equipamentos','geral') NOT NULL,
	`prioridade` enum('baixa','media','alta') NOT NULL DEFAULT 'media',
	`implementada` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sugestoes_melhoria_id` PRIMARY KEY(`id`)
);
