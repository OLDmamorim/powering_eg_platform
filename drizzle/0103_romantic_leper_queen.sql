CREATE TABLE `agendamentos_loja` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`gestorId` int NOT NULL,
	`matricula` varchar(20) NOT NULL,
	`viatura` varchar(150),
	`tipoServico` enum('PB','LT','OC','REP','POL') NOT NULL,
	`localidade` varchar(100),
	`data` varchar(10),
	`periodo` enum('manha','tarde'),
	`estadoVidro` enum('nao_encomendado','encomendado','terminado') NOT NULL DEFAULT 'nao_encomendado',
	`morada` varchar(500),
	`telefone` varchar(20),
	`notas` text,
	`extra` varchar(255),
	`km` int,
	`sortIndex` int NOT NULL DEFAULT 1,
	`obraNo` int,
	`anulado` boolean NOT NULL DEFAULT false,
	`motivoAnulacao` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agendamentos_loja_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `localidades_agendamento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`nome` varchar(100) NOT NULL,
	`cor` varchar(20) NOT NULL DEFAULT '#9CA3AF',
	`activo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `localidades_agendamento_id` PRIMARY KEY(`id`)
);
