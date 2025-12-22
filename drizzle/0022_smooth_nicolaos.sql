CREATE TABLE `resumos_globais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodo` enum('mensal','trimestral','semestral','anual') NOT NULL,
	`dataInicio` timestamp NOT NULL,
	`dataFim` timestamp NOT NULL,
	`conteudo` text NOT NULL,
	`geradoPor` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resumos_globais_id` PRIMARY KEY(`id`)
);
