CREATE TABLE `calibragens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidadeId` int NOT NULL,
	`lojaId` int NOT NULL,
	`data` varchar(10) NOT NULL,
	`marca` varchar(100),
	`matricula` varchar(20) NOT NULL,
	`tipologiaViatura` enum('LIGEIRO','PESADO') NOT NULL DEFAULT 'LIGEIRO',
	`tipoCalibragem` enum('DINÂMICA','ESTÁTICA','CORE') NOT NULL,
	`localidade` varchar(255),
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calibragens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tokens_recalibra` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidadeId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimoAcesso` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tokens_recalibra_id` PRIMARY KEY(`id`),
	CONSTRAINT `tokens_recalibra_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `unidade_lojas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidadeId` int NOT NULL,
	`lojaId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `unidade_lojas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unidades_recalibra` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`email` varchar(320),
	`telefone` varchar(50),
	`gestorId` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`telegramChatId` varchar(100),
	`telegramUsername` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `unidades_recalibra_id` PRIMARY KEY(`id`)
);
