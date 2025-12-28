CREATE TABLE `game_states` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`current_turn` text,
	`deck` text,
	`action_log` text DEFAULT '[]',
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`name` text NOT NULL,
	`socket_id` text,
	`auth_token` text NOT NULL,
	`cards` text DEFAULT '[]',
	`revealed_cards` text DEFAULT '[]',
	`coins` integer DEFAULT 2 NOT NULL,
	`is_alive` integer DEFAULT true NOT NULL,
	`is_host` integer DEFAULT false NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`host_name` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_code_unique` ON `rooms` (`code`);