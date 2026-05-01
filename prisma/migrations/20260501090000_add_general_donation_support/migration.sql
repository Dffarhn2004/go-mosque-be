ALTER TABLE "Masjid"
ADD COLUMN "isOpenForGeneralDonation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "GeneralDonationTitle" TEXT,
ADD COLUMN "GeneralDonationDescription" TEXT,
ADD COLUMN "GeneralDonationImage" TEXT;

CREATE TYPE "DonationChannel" AS ENUM ('GENERAL', 'CAMPAIGN');

ALTER TABLE "Donasi"
ADD COLUMN "DonationChannel" "DonationChannel" NOT NULL DEFAULT 'CAMPAIGN',
ADD COLUMN "masjidId" TEXT,
ALTER COLUMN "id_donasi_masjid" DROP NOT NULL;

ALTER TABLE "Donasi"
ADD CONSTRAINT "Donasi_masjidId_fkey"
FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
