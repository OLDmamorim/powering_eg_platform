CREATE TABLE `analises_stock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`lojaId` int,
	`nomeLoja` varchar(255),
	`totalItensStock` int NOT NULL DEFAULT 0,
	`totalComFichas` int NOT NULL DEFAULT 0,
	`totalSemFichas` int NOT NULL DEFAULT 0,
	`totalFichasSemStock` int NOT NULL DEFAULT 0,
	`dadosStock` text,
	`resultadoAnalise` text,
	`analiseIdFichas` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analises_stock_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eurocodes_fichas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analiseId` int NOT NULL,
	`lojaId` int,
	`nomeLoja` varchar(255) NOT NULL,
	`obrano` int NOT NULL,
	`matricula` varchar(20),
	`eurocode` varchar(100) NOT NULL,
	`ref` varchar(100),
	`marca` varchar(100),
	`modelo` varchar(100),
	`status` varchar(100),
	`diasAberto` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eurocodes_fichas_id` PRIMARY KEY(`id`)
);
