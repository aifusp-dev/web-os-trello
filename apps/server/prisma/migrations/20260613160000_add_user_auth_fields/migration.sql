-- AlterTable
-- The User model gained `password` and `permissions` in an earlier change
-- that was never accompanied by a migration. Add them now. Existing rows
-- get the documented default admin password (aifusp2026, bcrypt-hashed)
-- and the original default permission set.
ALTER TABLE "User" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2b$10$WnH2OBeoGqEKNnGDxqa6QO0uKB63RXsKZRaXw2feV37bSWiL/F/om';
ALTER TABLE "User" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY['kanban']::TEXT[];

ALTER TABLE "User" ALTER COLUMN "password" DROP DEFAULT;
