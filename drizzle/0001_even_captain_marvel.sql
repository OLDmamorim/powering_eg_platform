CREATE TABLE `gestor_lojas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`lojaId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gestor_lojas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gestores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`morada` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gestores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lojas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`morada` text NOT NULL,
	`contacto` varchar(50),
	`email` varchar(320),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`ativa` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lojas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pendentes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`relatorioId` int,
	`tipoRelatorio` enum('livre','completo'),
	`descricao` text NOT NULL,
	`resolvido` boolean NOT NULL DEFAULT false,
	`dataResolucao` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pendentes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relatorios_completos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`lojaId` int NOT NULL,
	`dataVisita` timestamp NOT NULL,
	`episFardamento` text,
	`kitPrimeirosSocorros` text,
	`consumiveis` text,
	`espacoFisico` text,
	`reclamacoes` text,
	`vendasComplementares` text,
	`fichasServico` text,
	`documentacaoObrigatoria` text,
	`reuniaoQuinzenal` boolean,
	`resumoSupervisao` text,
	`colaboradoresPresentes` text,
	`emailEnviado` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relatorios_completos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relatorios_livres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`lojaId` int NOT NULL,
	`dataVisita` timestamp NOT NULL,
	`descricao` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relatorios_livres_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','gestor') NOT NULL DEFAULT 'gestor';