CREATE TABLE `relatoriosIACategorias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conteudo` text NOT NULL,
	`geradoPor` int NOT NULL,
	`versao` varchar(20) NOT NULL DEFAULT '5.8',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `relatoriosIACategorias_id` PRIMARY KEY(`id`)
);
