CREATE TABLE `pendentes_loja` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`criadoPor` int NOT NULL,
	`descricao` text NOT NULL,
	`prioridade` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`estado` enum('pendente','em_progresso','resolvido') NOT NULL DEFAULT 'pendente',
	`comentarioLoja` text,
	`dataResolucao` timestamp,
	`resolvidoNaReuniaoId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pendentes_loja_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reunioes_quinzenais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`dataReuniao` timestamp NOT NULL,
	`participantes` text NOT NULL,
	`temasDiscutidos` text,
	`decisoesTomadas` text,
	`observacoes` text,
	`analiseResultados` text,
	`planosAcao` text,
	`estado` enum('rascunho','concluida','enviada') NOT NULL DEFAULT 'rascunho',
	`dataEnvio` timestamp,
	`emailEnviadoPara` varchar(320),
	`feedbackGestor` text,
	`dataFeedback` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reunioes_quinzenais_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tokens_loja` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimoAcesso` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tokens_loja_id` PRIMARY KEY(`id`),
	CONSTRAINT `tokens_loja_lojaId_unique` UNIQUE(`lojaId`),
	CONSTRAINT `tokens_loja_token_unique` UNIQUE(`token`)
);
