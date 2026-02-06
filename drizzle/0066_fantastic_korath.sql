CREATE TABLE `envios_rh` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`mesReferencia` varchar(20) NOT NULL,
	`totalColaboradores` int NOT NULL,
	`totalEmLojas` int NOT NULL,
	`totalVolantes` int NOT NULL,
	`totalRecalbra` int NOT NULL,
	`emailDestino` varchar(320) NOT NULL,
	`emailEnviado` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `envios_rh_id` PRIMARY KEY(`id`)
);
