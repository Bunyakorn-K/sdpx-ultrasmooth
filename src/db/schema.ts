import {
  bigint,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", ["PENDING", "ACTIVE"]);
export const classroomRoleEnum = pgEnum("classroom_role", ["INSTRUCTOR", "STUDENT"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["DRAFT", "PUBLISHED"]);
export const comparisonStatusEnum = pgEnum("comparison_status", ["draft", "saved", "submitted"]);

export const users = pgTable("user", {
  id: serial("id").primaryKey(),
  emailNormalized: text("email_normalized").notNull(),
  emailRaw: text("email_raw").notNull(),
  displayName: text("display_name"),
  status: userStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("user_email_normalized_idx").on(table.emailNormalized),
]);

export const classrooms = pgTable("classroom", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("classroom_slug_idx").on(table.slug),
]);

export const groupEntities = pgTable("group_entity", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id").notNull().references(() => classrooms.id),
  name: text("name").notNull(),
  artifactUrl: text("artifact_url"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("group_entity_classroom_name_unique").on(table.classroomId, table.name),
]);

export const classroomMembers = pgTable("classroom_member", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id").notNull().references(() => classrooms.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: classroomRoleEnum("role").notNull(),
  groupId: integer("group_id").references(() => groupEntities.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("classroom_member_classroom_user_unique").on(table.classroomId, table.userId),
]);

export const assignments = pgTable("assignment", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id").notNull().references(() => classrooms.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  groupMaxScore: numeric("group_max_score", { precision: 6, scale: 2 }).notNull().default("100"),
  scoreFloorPct: numeric("score_floor_pct", { precision: 5, scale: 2 }).notNull().default("60"),
  scoreCeilingPct: numeric("score_ceiling_pct", { precision: 5, scale: 2 }).notNull().default("100"),
  targetCoverage: integer("target_coverage").notNull().default(5),
  maxWorkload: integer("max_workload").notNull().default(8),
  deadlineUtc: timestamp("deadline_utc", { withTimezone: true }),
  pairingSeed: bigint("pairing_seed", { mode: "number" }),
  status: assignmentStatusEnum("status").notNull().default("DRAFT"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("assignment_classroom_slug_unique").on(table.classroomId, table.slug),
]);

export const criteria = pgTable("criterion", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  name: text("name").notNull(),
  weightPct: numeric("weight_pct", { precision: 5, scale: 2 }).notNull().default("100"),
  displayOrder: integer("display_order").notNull().default(0),
});

export const pairAssignments = pgTable("pair_assignment", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  criterionId: integer("criterion_id").notNull().references(() => criteria.id),
  itemAId: integer("item_a_id").notNull().references(() => groupEntities.id),
  itemBId: integer("item_b_id").notNull().references(() => groupEntities.id),
  evaluatorUserId: integer("evaluator_user_id").notNull().references(() => users.id),
  displayLeftItemId: integer("display_left_item_id").notNull(),
  generation: integer("generation").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("pair_assignment_unique").on(
    table.assignmentId,
    table.criterionId,
    table.evaluatorUserId,
    table.itemAId,
    table.itemBId,
    table.generation,
  ),
]);

export const comparisons = pgTable("comparison", {
  id: serial("id").primaryKey(),
  pairAssignmentId: integer("pair_assignment_id").notNull().references(() => pairAssignments.id),
  evaluatorUserId: integer("evaluator_user_id").notNull().references(() => users.id),
  choice: smallint("choice"),
  status: comparisonStatusEnum("status").notNull().default("draft"),
  savedAt: timestamp("saved_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("comparison_pair_assignment_idx").on(table.pairAssignmentId),
]);
