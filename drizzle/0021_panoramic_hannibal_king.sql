CREATE TABLE `relatorios_ia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodo` enum('diario','semanal','mensal','trimestral') NOT NULL,
	`conteudo` text NOT NULL,
	`geradoPor` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `relatorios_ia_id` PRIMARY KEY(`id`)
);
