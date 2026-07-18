CREATE TABLE `household_memberships` (
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`household_id`, `user_id`),
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `household_memberships_user_id_idx` ON `household_memberships` (`user_id`);--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `households_created_by_user_id_idx` ON `households` (`created_by_user_id`);--> statement-breakpoint
CREATE TABLE `source_credentials` (
	`source_id` text PRIMARY KEY NOT NULL,
	`format_version` integer NOT NULL,
	`algorithm` text NOT NULL,
	`key_id` text NOT NULL,
	`initialization_vector` text NOT NULL,
	`ciphertext` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `users` (`id`, `display_name`, `created_at`, `updated_at`)
VALUES ('teloche-legacy-user', 'Legacy catalog owner', 0, 0);--> statement-breakpoint
INSERT OR IGNORE INTO `households` (`id`, `name`, `created_by_user_id`, `created_at`, `updated_at`)
VALUES ('teloche-legacy-household', 'Legacy sources', 'teloche-legacy-user', 0, 0);--> statement-breakpoint
INSERT OR IGNORE INTO `household_memberships` (`household_id`, `user_id`, `role`, `created_at`)
VALUES ('teloche-legacy-household', 'teloche-legacy-user', 'owner', 0);--> statement-breakpoint
ALTER TABLE `sources` ADD `household_id` text NOT NULL DEFAULT 'teloche-legacy-household' REFERENCES households(id);--> statement-breakpoint
ALTER TABLE `sources` ADD `last_validation_status` text;--> statement-breakpoint
ALTER TABLE `sources` ADD `last_validated_at` integer;--> statement-breakpoint
CREATE INDEX `sources_household_id_idx` ON `sources` (`household_id`);
