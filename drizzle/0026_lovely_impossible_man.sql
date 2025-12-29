CREATE TABLE `totais_mensais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`totalServicos` int,
	`objetivoMensal` int,
	`numColaboradores` int,
	`taxaReparacao` decimal(5,4),
	`qtdReparacoes` int,
	`qtdParaBrisas` int,
	`nomeArquivo` varchar(255),
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `totais_mensais_id` PRIMARY KEY(`id`)
);
