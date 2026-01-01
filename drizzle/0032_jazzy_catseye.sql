CREATE TABLE `ocorrencias_estruturais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`temaId` int NOT NULL,
	`descricao` text NOT NULL,
	`abrangencia` enum('nacional','regional','zona') NOT NULL DEFAULT 'nacional',
	`zonaAfetada` varchar(100),
	`lojasAfetadas` text,
	`impacto` enum('baixo','medio','alto','critico') NOT NULL DEFAULT 'medio',
	`fotos` text,
	`sugestaoAcao` text,
	`estado` enum('reportado','em_analise','em_resolucao','resolvido') NOT NULL DEFAULT 'reportado',
	`notasAdmin` text,
	`resolvidoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ocorrencias_estruturais_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `temas_ocorrencias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`criadoPorId` int NOT NULL,
	`usageCount` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `temas_ocorrencias_id` PRIMARY KEY(`id`),
	CONSTRAINT `temas_ocorrencias_nome_unique` UNIQUE(`nome`)
);
