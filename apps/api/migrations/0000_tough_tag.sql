CREATE TABLE `ChatMessages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`message_id` text,
	`content` text NOT NULL,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `ChatSessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ChatSessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_address` text NOT NULL,
	`title` text DEFAULT 'New Chat' NOT NULL,
	`is_first_run` integer DEFAULT true,
	`preview_url` text,
	`input_token` integer DEFAULT 0,
	`output_token` integer DEFAULT 0,
	`total_token` integer DEFAULT 0,
	`init_message` text,
	`model_id` text,
	`active_stream_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`code_gen_status` text DEFAULT 'draft',
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `Deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`build_key` text NOT NULL,
	`upload_id` text NOT NULL,
	`object_id` text,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`output` text DEFAULT '' NOT NULL,
	`stderr` text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `PendingPayments` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`nonce` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`tx_digest` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `SandboxFiles` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`file_path` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`session_id`) REFERENCES `ChatSessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Sites` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`title` text NOT NULL,
	`desc` text,
	`icon` text,
	`created_at` integer DEFAULT (unixepoch()),
	`is_latest` integer DEFAULT false,
	`dist_package_url` text,
	`site_id` text,
	`tx_digest_register_blob` text,
	`tx_digest_update_site_metadata` text,
	`tx_digest_certify_upload` text,
	FOREIGN KEY (`session_id`) REFERENCES `ChatSessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_cursors` (
	`id` text PRIMARY KEY NOT NULL,
	`last_cursor` text,
	`last_processed_at` integer DEFAULT (unixepoch()),
	`processed_count` integer DEFAULT 0,
	`error_count` integer DEFAULT 0,
	`status` text DEFAULT 'active' NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `TransactionHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`addr` text,
	`amount` integer,
	`note` text,
	`timestamp` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `Users` (
	`addr` text PRIMARY KEY NOT NULL,
	`balance` integer,
	`created_at` integer DEFAULT (unixepoch())
);
