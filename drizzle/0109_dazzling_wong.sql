CREATE TABLE `ferias_volantes_marcados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomeColaborador` varchar(255) NOT NULL,
	`loja` varchar(255) NOT NULL,
	`gestorNome` varchar(255) NOT NULL,
	`marcadoPorUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ferias_volantes_marcados_id` PRIMARY KEY(`id`)
);
