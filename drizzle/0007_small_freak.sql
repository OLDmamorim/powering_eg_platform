CREATE TABLE `configuracoes_alertas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chave` varchar(100) NOT NULL,
	`valor` text NOT NULL,
	`descricao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configuracoes_alertas_id` PRIMARY KEY(`id`),
	CONSTRAINT `configuracoes_alertas_chave_unique` UNIQUE(`chave`)
);
