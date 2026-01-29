CREATE TABLE `analises_fichas_servico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gestorId` int NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`dataUpload` timestamp NOT NULL DEFAULT (now()),
	`totalFichas` int NOT NULL DEFAULT 0,
	`totalLojas` int NOT NULL DEFAULT 0,
	`resumoGeral` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analises_fichas_servico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evolucao_analises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analiseAtualId` int NOT NULL,
	`analiseAnteriorId` int NOT NULL,
	`lojaId` int,
	`nomeLoja` varchar(255) NOT NULL,
	`variacaoFichasAbertas5Dias` int DEFAULT 0,
	`variacaoFichasAposAgendamento` int DEFAULT 0,
	`variacaoFichasStatusAlerta` int DEFAULT 0,
	`variacaoFichasSemNotas` int DEFAULT 0,
	`variacaoFichasNotasAntigas` int DEFAULT 0,
	`variacaoFichasDevolverVidro` int DEFAULT 0,
	`evolucaoGeral` enum('melhorou','piorou','estavel') DEFAULT 'estavel',
	`comentario` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evolucao_analises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relatorios_analise_loja` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analiseId` int NOT NULL,
	`lojaId` int,
	`nomeLoja` varchar(255) NOT NULL,
	`numeroLoja` int,
	`totalFichas` int NOT NULL DEFAULT 0,
	`fichasAbertas5Dias` int NOT NULL DEFAULT 0,
	`fichasAposAgendamento` int NOT NULL DEFAULT 0,
	`fichasStatusAlerta` int NOT NULL DEFAULT 0,
	`fichasSemNotas` int NOT NULL DEFAULT 0,
	`fichasNotasAntigas` int NOT NULL DEFAULT 0,
	`fichasDevolverVidro` int NOT NULL DEFAULT 0,
	`fichasSemEmailCliente` int NOT NULL DEFAULT 0,
	`conteudoRelatorio` text NOT NULL,
	`resumo` text,
	`emailEnviado` boolean NOT NULL DEFAULT false,
	`dataEnvioEmail` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relatorios_analise_loja_id` PRIMARY KEY(`id`)
);
