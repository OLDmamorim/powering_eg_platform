CREATE TABLE `notas_loja` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`titulo` varchar(500) NOT NULL,
	`conteudo` mediumtext,
	`tema` enum('stock','procedimentos','administrativo','recursos_humanos','ausencias','reunioes','clientes','geral') NOT NULL DEFAULT 'geral',
	`fixada` boolean NOT NULL DEFAULT false,
	`arquivada` boolean NOT NULL DEFAULT false,
	`criadoPor` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notas_loja_id` PRIMARY KEY(`id`)
);
