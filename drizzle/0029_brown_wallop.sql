CREATE TABLE `todo_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`cor` varchar(7) NOT NULL DEFAULT '#3B82F6',
	`icone` varchar(50),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `todo_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`categoriaId` int,
	`prioridade` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`atribuidoLojaId` int,
	`atribuidoUserId` int,
	`criadoPorId` int NOT NULL,
	`estado` enum('pendente','em_progresso','concluida','devolvida') NOT NULL DEFAULT 'pendente',
	`comentario` text,
	`historicoAtribuicoes` text,
	`dataLimite` timestamp,
	`dataConclusao` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `todos_id` PRIMARY KEY(`id`)
);
