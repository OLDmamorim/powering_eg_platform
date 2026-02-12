CREATE TABLE `envios_relatorios_servicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesReferencia` varchar(7) NOT NULL,
	`tipoRelatorio` varchar(20) NOT NULL,
	`destinatarioId` int,
	`destinatarioEmail` varchar(255) NOT NULL,
	`destinatarioNome` varchar(255) NOT NULL,
	`volanteId` int NOT NULL,
	`volanteNome` varchar(255) NOT NULL,
	`pdfUrl` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'enviado',
	`dataEnvio` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `envios_relatorios_servicos_id` PRIMARY KEY(`id`)
);
