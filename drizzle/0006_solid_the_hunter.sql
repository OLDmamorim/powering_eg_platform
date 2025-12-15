CREATE TABLE `alertas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lojaId` int NOT NULL,
	`tipo` enum('pontos_negativos_consecutivos','pendentes_antigos','sem_visitas') NOT NULL,
	`descricao` text NOT NULL,
	`estado` enum('pendente','resolvido') NOT NULL DEFAULT 'pendente',
	`dataResolucao` timestamp,
	`notasResolucao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertas_id` PRIMARY KEY(`id`)
);
