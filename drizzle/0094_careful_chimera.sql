CREATE TABLE `classificacoes_eurocode` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`eurocode` varchar(100) NOT NULL,
	`classificacao` enum('devolucao_rejeitada','usado','com_danos','para_devolver') NOT NULL,
	`primeiraAnaliseId` int NOT NULL,
	`ultimaAnaliseId` int NOT NULL,
	`analisesConsecutivas` int NOT NULL DEFAULT 1,
	`activo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classificacoes_eurocode_id` PRIMARY KEY(`id`)
);
