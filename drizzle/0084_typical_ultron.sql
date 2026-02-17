CREATE TABLE `historico_envios_relatorios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo` enum('volante','recalibra') NOT NULL,
	`mesReferencia` int NOT NULL,
	`anoReferencia` int NOT NULL,
	`dataEnvio` timestamp NOT NULL,
	`emailsEnviadosUnidades` int NOT NULL DEFAULT 0,
	`emailsEnviadosGestores` int NOT NULL DEFAULT 0,
	`emailsErro` int NOT NULL DEFAULT 0,
	`detalhes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historico_envios_relatorios_id` PRIMARY KEY(`id`)
);
