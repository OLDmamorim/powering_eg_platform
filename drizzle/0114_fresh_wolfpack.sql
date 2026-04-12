CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`keyHash` varchar(255) NOT NULL,
	`keyPrefix` varchar(10) NOT NULL,
	`permissoes` json NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimoUso` timestamp,
	`totalRequests` int NOT NULL DEFAULT 0,
	`criadoPor` int NOT NULL,
	`criadoPorNome` varchar(255),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
