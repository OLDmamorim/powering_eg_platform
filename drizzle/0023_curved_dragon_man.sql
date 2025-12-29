CREATE TABLE `acoes_reunioes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reuniaoId` int NOT NULL,
	`tipoReuniao` enum('gestores','lojas') NOT NULL,
	`descricao` text NOT NULL,
	`gestorIds` text NOT NULL,
	`status` enum('pendente','concluida') NOT NULL DEFAULT 'pendente',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `acoes_reunioes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reunioes_gestores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`data` timestamp NOT NULL,
	`presencas` text NOT NULL,
	`outrosPresentes` text,
	`conteudo` text NOT NULL,
	`resumoIA` text,
	`tags` text,
	`criadoPor` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reunioes_gestores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reunioes_lojas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`data` timestamp NOT NULL,
	`lojaIds` text NOT NULL,
	`presencas` text NOT NULL,
	`conteudo` text NOT NULL,
	`resumoIA` text,
	`tags` text,
	`criadoPor` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reunioes_lojas_id` PRIMARY KEY(`id`)
);
