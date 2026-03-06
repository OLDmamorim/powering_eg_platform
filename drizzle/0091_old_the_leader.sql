CREATE TABLE `vidros_destinatarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomeEtiqueta` varchar(500) NOT NULL,
	`lojaId` int,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vidros_destinatarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vidros_recepcao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`destinatarioRaw` varchar(500),
	`eurocode` varchar(100),
	`numeroPedido` varchar(100),
	`codAT` varchar(100),
	`encomenda` varchar(255),
	`leitRef` varchar(100),
	`observacoesEtiqueta` text,
	`fotoUrl` text,
	`fotoKey` varchar(500),
	`destinatarioId` int,
	`lojaScanId` int,
	`lojaDestinoId` int,
	`estado` enum('pendente_associacao','recebido','confirmado') NOT NULL DEFAULT 'recebido',
	`registadoPorToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vidros_recepcao_id` PRIMARY KEY(`id`)
);
