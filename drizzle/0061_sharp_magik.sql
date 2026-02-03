CREATE TABLE `colaboradores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`codigo` varchar(50),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `colaboradores_id` PRIMARY KEY(`id`)
);
