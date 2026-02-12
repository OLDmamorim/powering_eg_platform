CREATE TABLE `servicos_volante` (
	`id` int AUTO_INCREMENT NOT NULL,
	`data` date NOT NULL,
	`volanteId` int NOT NULL,
	`lojaId` int NOT NULL,
	`substituicaoLigeiro` int NOT NULL DEFAULT 0,
	`reparacao` int NOT NULL DEFAULT 0,
	`calibragem` int NOT NULL DEFAULT 0,
	`outros` int NOT NULL DEFAULT 0,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `servicos_volante_id` PRIMARY KEY(`id`)
);
