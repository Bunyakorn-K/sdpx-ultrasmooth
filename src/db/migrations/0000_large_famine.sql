CREATE TYPE "public"."assignment_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."classroom_role" AS ENUM('INSTRUCTOR', 'STUDENT');--> statement-breakpoint
CREATE TYPE "public"."comparison_status" AS ENUM('draft', 'saved', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('PENDING', 'ACTIVE');--> statement-breakpoint
CREATE TABLE "assignment" (
	"id" serial PRIMARY KEY NOT NULL,
	"classroom_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"group_max_score" numeric(6, 2) DEFAULT '100' NOT NULL,
	"score_floor_pct" numeric(5, 2) DEFAULT '60' NOT NULL,
	"score_ceiling_pct" numeric(5, 2) DEFAULT '100' NOT NULL,
	"target_coverage" integer DEFAULT 5 NOT NULL,
	"max_workload" integer DEFAULT 8 NOT NULL,
	"deadline_utc" timestamp with time zone,
	"pairing_seed" bigint,
	"status" "assignment_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_classroom_slug_unique" UNIQUE("classroom_id","slug")
);
--> statement-breakpoint
CREATE TABLE "classroom_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"classroom_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "classroom_role" NOT NULL,
	"group_id" integer,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classroom_member_classroom_user_unique" UNIQUE("classroom_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "classroom" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison" (
	"id" serial PRIMARY KEY NOT NULL,
	"pair_assignment_id" integer NOT NULL,
	"evaluator_user_id" integer NOT NULL,
	"choice" smallint,
	"status" "comparison_status" DEFAULT 'draft' NOT NULL,
	"saved_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "criterion" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"name" text NOT NULL,
	"weight_pct" numeric(5, 2) DEFAULT '100' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_entity" (
	"id" serial PRIMARY KEY NOT NULL,
	"classroom_id" integer NOT NULL,
	"name" text NOT NULL,
	"artifact_url" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_entity_classroom_name_unique" UNIQUE("classroom_id","name")
);
--> statement-breakpoint
CREATE TABLE "pair_assignment" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"criterion_id" integer NOT NULL,
	"item_a_id" integer NOT NULL,
	"item_b_id" integer NOT NULL,
	"evaluator_user_id" integer NOT NULL,
	"display_left_item_id" integer NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pair_assignment_unique" UNIQUE("assignment_id","criterion_id","evaluator_user_id","item_a_id","item_b_id","generation")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_normalized" text NOT NULL,
	"email_raw" text NOT NULL,
	"display_name" text,
	"status" "user_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_member" ADD CONSTRAINT "classroom_member_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_member" ADD CONSTRAINT "classroom_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_member" ADD CONSTRAINT "classroom_member_group_id_group_entity_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom" ADD CONSTRAINT "classroom_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison" ADD CONSTRAINT "comparison_pair_assignment_id_pair_assignment_id_fk" FOREIGN KEY ("pair_assignment_id") REFERENCES "public"."pair_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison" ADD CONSTRAINT "comparison_evaluator_user_id_user_id_fk" FOREIGN KEY ("evaluator_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterion" ADD CONSTRAINT "criterion_assignment_id_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_entity" ADD CONSTRAINT "group_entity_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pair_assignment" ADD CONSTRAINT "pair_assignment_assignment_id_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pair_assignment" ADD CONSTRAINT "pair_assignment_criterion_id_criterion_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."criterion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pair_assignment" ADD CONSTRAINT "pair_assignment_item_a_id_group_entity_id_fk" FOREIGN KEY ("item_a_id") REFERENCES "public"."group_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pair_assignment" ADD CONSTRAINT "pair_assignment_item_b_id_group_entity_id_fk" FOREIGN KEY ("item_b_id") REFERENCES "public"."group_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pair_assignment" ADD CONSTRAINT "pair_assignment_evaluator_user_id_user_id_fk" FOREIGN KEY ("evaluator_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "classroom_slug_idx" ON "classroom" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "comparison_pair_assignment_idx" ON "comparison" USING btree ("pair_assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_normalized_idx" ON "user" USING btree ("email_normalized");