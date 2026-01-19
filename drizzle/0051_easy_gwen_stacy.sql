CREATE TABLE `loja_volante` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`volanteId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loja_volante_id` PRIMARY KEY(`id`),
	CONSTRAINT `loja_volante_lojaId_unique` UNIQUE(`lojaId`)
);
--> statement-breakpoint
CREATE TABLE `pedidos_apoio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`volanteId` int NOT NULL,
	`data` timestamp NOT NULL,
	`pedido_apoio_periodo` enum('manha','tarde') NOT NULL,
	`pedido_apoio_tipo` enum('cobertura_ferias','substituicao_vidros','outro') NOT NULL,
	`observacoes` text,
	`pedido_apoio_estado` enum('pendente','aprovado','reprovado','cancelado') NOT NULL DEFAULT 'pendente',
	`dataResposta` timestamp,
	`motivoReprovacao` text,
	`linkGoogleCalendar` text,
	`linkOutlook` text,
	`linkICS` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pedidos_apoio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tokens_volante` (
	`id` int AUTO_INCREMENT NOT NULL,
	`volanteId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimoAcesso` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tokens_volante_id` PRIMARY KEY(`id`),
	CONSTRAINT `tokens_volante_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `volante_lojas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`volanteId` int NOT NULL,
	`lojaId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `volante_lojas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `volantes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`email` varchar(320),
	`telefone` varchar(50),
	`gestorId` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `volantes_id` PRIMARY KEY(`id`)
);
