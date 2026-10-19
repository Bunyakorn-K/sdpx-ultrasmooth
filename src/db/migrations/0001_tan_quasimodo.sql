CREATE TABLE "assignment_group_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "assignment_group_member_unique" UNIQUE("assignment_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "group_entity" DROP CONSTRAINT "group_entity_classroom_name_unique";--> statement-breakpoint
ALTER TABLE "group_entity" ADD COLUMN "assignment_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "auth_subject" text;--> statement-breakpoint
ALTER TABLE "assignment_group_member" ADD CONSTRAINT "assignment_group_member_assignment_id_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_group_member" ADD CONSTRAINT "assignment_group_member_group_id_group_entity_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group_entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_group_member" ADD CONSTRAINT "assignment_group_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_entity" ADD CONSTRAINT "group_entity_assignment_id_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_auth_subject_idx" ON "user" USING btree ("auth_subject");--> statement-breakpoint
ALTER TABLE "group_entity" ADD CONSTRAINT "group_entity_classroom_name_unique" UNIQUE("classroom_id","assignment_id","name");