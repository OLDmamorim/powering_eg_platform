CREATE TABLE `background_jobs` (
	`id` varchar(100) NOT NULL,
	`status` enum('processing','completed','error') NOT NULL DEFAULT 'processing',
	`progress` text,
	`result` mediumtext,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `background_jobs_id` PRIMARY KEY(`id`)
);
