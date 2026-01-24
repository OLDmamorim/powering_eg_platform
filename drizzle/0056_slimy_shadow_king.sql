ALTER TABLE `agendamentos_volante` ADD `agendamento_volante_periodo` enum('manha','tarde','dia_todo') NOT NULL;--> statement-breakpoint
ALTER TABLE `agendamentos_volante` ADD `agendamento_volante_tipo` enum('cobertura_ferias','substituicao_vidros','outro');--> statement-breakpoint
ALTER TABLE `agendamentos_volante` DROP COLUMN `pedido_apoio_periodo`;--> statement-breakpoint
ALTER TABLE `agendamentos_volante` DROP COLUMN `pedido_apoio_tipo`;