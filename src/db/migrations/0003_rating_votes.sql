CREATE TABLE "rating" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"criterion_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"evaluator_user_id" integer NOT NULL,
	"score" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_unique" UNIQUE("criterion_id","group_id","evaluator_user_id"),
	CONSTRAINT "rating_score_range" CHECK ("rating"."score" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_assignment_id_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_criterion_id_criterion_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."criterion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_group_id_group_entity_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_evaluator_user_id_user_id_fk" FOREIGN KEY ("evaluator_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;