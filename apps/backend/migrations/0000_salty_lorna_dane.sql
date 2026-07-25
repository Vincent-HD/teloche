CREATE TABLE `catalog_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`artwork_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `catalog_items_kind_name_idx` ON `catalog_items` (`kind`,`name`);--> statement-breakpoint
CREATE TABLE `collection_items` (
	`collection_id` text NOT NULL,
	`source_item_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`collection_id`, `source_item_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_item_id`) REFERENCES `source_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collection_items_source_item_id_idx` ON `collection_items` (`source_item_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`parent_id` text,
	`external_id` text NOT NULL,
	`content_kind` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_source_kind_external_id_uidx` ON `collections` (`source_id`,`content_kind`,`external_id`);--> statement-breakpoint
CREATE INDEX `collections_source_kind_position_idx` ON `collections` (`source_id`,`content_kind`,`position`);--> statement-breakpoint
CREATE TABLE `source_channel_details` (
	`source_item_id` text PRIMARY KEY NOT NULL,
	`guide_channel_id` text,
	`is_adult` integer DEFAULT false NOT NULL,
	`catchup_enabled` integer DEFAULT false NOT NULL,
	`catchup_window_seconds` integer,
	FOREIGN KEY (`source_item_id`) REFERENCES `source_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `source_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`item_id` text NOT NULL,
	`external_id` text NOT NULL,
	`content_kind` text NOT NULL,
	`source_name` text NOT NULL,
	`source_artwork_url` text,
	`provider_position` integer NOT NULL,
	`provider_added_at` integer,
	`active` integer DEFAULT true NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_items_source_kind_external_id_uidx` ON `source_items` (`source_id`,`content_kind`,`external_id`);--> statement-breakpoint
CREATE INDEX `source_items_source_kind_position_idx` ON `source_items` (`source_id`,`content_kind`,`provider_position`);--> statement-breakpoint
CREATE INDEX `source_items_item_id_idx` ON `source_items` (`item_id`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`adapter_key` text NOT NULL,
	`name` text NOT NULL,
	`endpoint` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_successful_sync_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sources_adapter_key_idx` ON `sources` (`adapter_key`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`scope` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`collections_seen` integer DEFAULT 0 NOT NULL,
	`items_seen` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`error_message` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sync_runs_source_started_at_idx` ON `sync_runs` (`source_id`,`started_at`);