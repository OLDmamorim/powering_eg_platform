CREATE TABLE `chatbot_mensagens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessaoId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` mediumtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatbot_mensagens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatbot_sessoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`portalToken` varchar(255),
	`portalLoja` varchar(255),
	`titulo` varchar(500),
	`totalMensagens` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatbot_sessoes_id` PRIMARY KEY(`id`)
);
