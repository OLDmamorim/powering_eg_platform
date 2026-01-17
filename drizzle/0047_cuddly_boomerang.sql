CREATE TABLE `projecoes_visitas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`semanaInicio` timestamp NOT NULL,
	`semanaFim` timestamp NOT NULL,
	`tipoPeriodo` enum('esta_semana','proxima_semana') NOT NULL,
	`visitasPlaneadas` text NOT NULL,
	`estado` enum('gerada','confirmada','em_progresso','concluida') NOT NULL DEFAULT 'gerada',
	`notas` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projecoes_visitas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visitas_planeadas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projecaoId` int NOT NULL,
	`lojaId` int NOT NULL,
	`dataVisita` timestamp NOT NULL,
	`horaInicio` varchar(5),
	`horaFim` varchar(5),
	`motivo` enum('tempo_sem_visita','pendentes_ativos','resultados_baixos','manual') NOT NULL,
	`prioridade` int NOT NULL,
	`detalheMotivo` text,
	`estado` enum('planeada','confirmada','realizada','cancelada') NOT NULL DEFAULT 'planeada',
	`linkGoogleCalendar` text,
	`linkOutlook` text,
	`linkICS` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visitas_planeadas_id` PRIMARY KEY(`id`)
);
