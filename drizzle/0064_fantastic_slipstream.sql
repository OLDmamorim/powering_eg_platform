ALTER TABLE `colaboradores` ADD `tipo` enum('loja','volante','recalbra') DEFAULT 'loja' NOT NULL;--> statement-breakpoint
ALTER TABLE `colaboradores` DROP COLUMN `isVolante`;