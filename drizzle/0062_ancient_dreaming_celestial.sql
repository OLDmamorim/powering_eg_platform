ALTER TABLE `colaboradores` RENAME COLUMN `codigo` TO `codigoColaborador`;--> statement-breakpoint
ALTER TABLE `colaboradores` MODIFY COLUMN `lojaId` int;--> statement-breakpoint
ALTER TABLE `colaboradores` ADD `gestorId` int;--> statement-breakpoint
ALTER TABLE `colaboradores` ADD `isVolante` boolean DEFAULT false NOT NULL;