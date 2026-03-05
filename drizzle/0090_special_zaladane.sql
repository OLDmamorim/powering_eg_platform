CREATE TABLE `notas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`conteudo` mediumtext,
	`lojaId` int,
	`userId` int NOT NULL,
	`estado` enum('rascunho','pendente','discutido','aprovado','adiado','em_analise','concluido') NOT NULL DEFAULT 'rascunho',
	`cor` varchar(20) DEFAULT '#ffffff',
	`fixada` boolean NOT NULL DEFAULT false,
	`arquivada` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notas_imagens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notaId` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`filename` varchar(255),
	`mimeType` varchar(100),
	`ordem` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notas_imagens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notas_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`cor` varchar(20) DEFAULT '#6366f1',
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notas_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notas_tags_relacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notaId` int NOT NULL,
	`tagId` int NOT NULL,
	CONSTRAINT `notas_tags_relacao_id` PRIMARY KEY(`id`)
);
