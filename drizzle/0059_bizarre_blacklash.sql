CREATE TABLE `fichas_identificadas_analise` (
	`id` int AUTO_INCREMENT NOT NULL,
	`relatorioId` int NOT NULL,
	`analiseId` int NOT NULL,
	`nomeLoja` varchar(255) NOT NULL,
	`categoria` enum('abertas5Dias','aposAgendamento','statusAlerta','semNotas','notasAntigas','devolverVidro','semEmailCliente') NOT NULL,
	`obrano` int NOT NULL,
	`matricula` varchar(20),
	`diasAberto` int,
	`status` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fichas_identificadas_analise_id` PRIMARY KEY(`id`)
);
