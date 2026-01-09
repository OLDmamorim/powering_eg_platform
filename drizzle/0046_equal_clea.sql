CREATE TABLE `relatorios_reuniao_gestores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reuniaoId` int NOT NULL,
	`resumoExecutivo` text,
	`topicosDiscutidos` text,
	`decisoesTomadas` text,
	`acoesDefinidas` text,
	`pdfUrl` text,
	`emailEnviadoEm` timestamp,
	`destinatariosEmail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relatorios_reuniao_gestores_id` PRIMARY KEY(`id`),
	CONSTRAINT `relatorios_reuniao_gestores_reuniaoId_unique` UNIQUE(`reuniaoId`)
);
--> statement-breakpoint
CREATE TABLE `topicos_reuniao_gestores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`estado` enum('pendente','analisado','discutido','nao_discutido','arquivado') NOT NULL DEFAULT 'pendente',
	`reuniaoId` int,
	`notasAdmin` text,
	`resultadoDiscussao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topicos_reuniao_gestores_id` PRIMARY KEY(`id`)
);
