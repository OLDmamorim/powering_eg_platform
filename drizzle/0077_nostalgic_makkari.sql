CREATE TABLE `localidades_recalibra` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `localidades_recalibra_id` PRIMARY KEY(`id`),
	CONSTRAINT `localidades_recalibra_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `marcas_recalibra` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marcas_recalibra_id` PRIMARY KEY(`id`),
	CONSTRAINT `marcas_recalibra_nome_unique` UNIQUE(`nome`)
);
