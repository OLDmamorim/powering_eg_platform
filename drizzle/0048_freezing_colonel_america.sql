CREATE TABLE `relacoes_lojas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaPrincipalId` int NOT NULL,
	`lojaRelacionadaId` int NOT NULL,
	`gestorId` int,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relacoes_lojas_id` PRIMARY KEY(`id`)
);
