/*
  Warnings:

  - The values [TANAH_WAFKAH] on the enum `StatusKepemilikan` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatusKepemilikan_new" AS ENUM ('MILIK_SENDIRI', 'TANAH_WAKAF', 'HIBAH', 'SEWA');
ALTER TABLE "Masjid" ALTER COLUMN "StatusKepemilikan" TYPE "StatusKepemilikan_new" USING ("StatusKepemilikan"::text::"StatusKepemilikan_new");
ALTER TYPE "StatusKepemilikan" RENAME TO "StatusKepemilikan_old";
ALTER TYPE "StatusKepemilikan_new" RENAME TO "StatusKepemilikan";
DROP TYPE "StatusKepemilikan_old";
COMMIT;
