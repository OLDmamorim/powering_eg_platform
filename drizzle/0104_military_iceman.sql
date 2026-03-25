CREATE TABLE `ferias_colaboradores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`loja` varchar(255) NOT NULL,
	`gestor` varchar(255),
	`ano` int NOT NULL,
	`dias` json NOT NULL,
	`totalAprovados` int DEFAULT 0,
	`totalNaoAprovados` int DEFAULT 0,
	`totalFeriados` int DEFAULT 0,
	`totalFaltas` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ferias_colaboradores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ferias_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`ano` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`uploadedByName` varchar(255),
	`totalColaboradores` int DEFAULT 0,
	`totalDiasAprovados` int DEFAULT 0,
	`totalDiasNaoAprovados` int DEFAULT 0,
	`totalFaltas` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ferias_uploads_id` PRIMARY KEY(`id`)
);
