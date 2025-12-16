ALTER TABLE `relatorios_completos` ADD `categoria` varchar(100);--> statement-breakpoint
ALTER TABLE `relatorios_completos` ADD `estadoAcompanhamento` enum('acompanhar','em_tratamento','tratado');--> statement-breakpoint
ALTER TABLE `relatorios_livres` ADD `categoria` varchar(100);--> statement-breakpoint
ALTER TABLE `relatorios_livres` ADD `estadoAcompanhamento` enum('acompanhar','em_tratamento','tratado');