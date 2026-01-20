CREATE TABLE `agendamentos_volante` (
	`id` int AUTO_INCREMENT NOT NULL,
	`volanteId` int NOT NULL,
	`lojaId` int,
	`data` timestamp NOT NULL,
	`pedido_apoio_periodo` enum('manha','tarde','dia_todo') NOT NULL,
	`pedido_apoio_tipo` enum('cobertura_ferias','substituicao_vidros','outro') NOT NULL,
	`titulo` varchar(255),
	`descricao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agendamentos_volante_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bloqueios_volante` (
	`id` int AUTO_INCREMENT NOT NULL,
	`volanteId` int NOT NULL,
	`data` timestamp NOT NULL,
	`pedido_apoio_periodo` enum('manha','tarde','dia_todo') NOT NULL,
	`bloqueio_volante_tipo` enum('ferias','falta','formacao','pessoal','outro') NOT NULL,
	`motivo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bloqueios_volante_id` PRIMARY KEY(`id`)
);
