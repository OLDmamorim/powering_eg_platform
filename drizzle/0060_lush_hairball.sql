ALTER TABLE `pendentes_loja` MODIFY COLUMN `criadoPor` int;--> statement-breakpoint
ALTER TABLE `pendentes_loja` ADD `criadoPelaLoja` boolean DEFAULT false NOT NULL;