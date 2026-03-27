CREATE TABLE `reuniao_tipos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`cor` varchar(20) DEFAULT '#6366f1',
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reuniao_tipos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reunioes_livres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`data` varchar(10) NOT NULL,
	`hora` varchar(5),
	`local` varchar(255),
	`tipoId` int,
	`presencas` text,
	`temas` mediumtext,
	`conclusoes` mediumtext,
	`observacoes` mediumtext,
	`gravacaoId` int,
	`userId` int NOT NULL,
	`estado` enum('rascunho','concluida','arquivada') NOT NULL DEFAULT 'rascunho',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reunioes_livres_id` PRIMARY KEY(`id`)
);
