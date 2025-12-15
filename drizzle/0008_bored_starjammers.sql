ALTER TABLE `pendentes` ADD `visto` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `relatorios_completos` ADD `visto` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `relatorios_livres` ADD `visto` boolean DEFAULT false NOT NULL;