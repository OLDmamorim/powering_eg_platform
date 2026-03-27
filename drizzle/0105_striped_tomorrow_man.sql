CREATE TABLE `gravacoes_reuniao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notaId` int,
	`titulo` varchar(500) NOT NULL,
	`audioUrl` text,
	`audioFileKey` varchar(500),
	`duracaoSegundos` int,
	`transcricao` mediumtext,
	`resumoIA` mediumtext,
	`idioma` varchar(10) DEFAULT 'pt',
	`estado` enum('a_gravar','gravado','a_transcrever','transcrito','a_resumir','concluido','erro') NOT NULL DEFAULT 'a_gravar',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gravacoes_reuniao_id` PRIMARY KEY(`id`)
);
