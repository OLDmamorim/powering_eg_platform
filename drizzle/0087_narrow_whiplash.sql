ALTER TABLE `loja_volante` DROP INDEX `loja_volante_lojaId_unique`;--> statement-breakpoint
ALTER TABLE `loja_volante` ADD `prioridade` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `lojas` ADD `subZona` varchar(100);--> statement-breakpoint
ALTER TABLE `pedidos_apoio` ADD `atribuidoPorIA` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pedidos_apoio` ADD `scoreAtribuicao` varchar(10);--> statement-breakpoint
ALTER TABLE `pedidos_apoio` ADD `redireccionadoDe` int;--> statement-breakpoint
ALTER TABLE `volantes` ADD `subZonaPreferencial` varchar(100);