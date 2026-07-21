CREATE TABLE "following" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" integer NOT NULL,
	"target_id" integer NOT NULL,
	"relationship_group" text,
	"followed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_items" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"category" text NOT NULL,
	"embedding" vector(768),
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"cover_url" text,
	"reaction" text,
	"rating" real,
	"critic_score" real,
	"review" text,
	"date_added" integer,
	"status" text,
	"is_private" boolean DEFAULT false,
	"visibility" text DEFAULT 'public',
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"handle" text,
	"photo_url" text,
	"account_type" text DEFAULT 'person',
	"is_discoverable" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "following" ADD CONSTRAINT "following_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "following" ADD CONSTRAINT "following_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;