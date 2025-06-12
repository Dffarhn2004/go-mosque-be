-- ✅ Trigger Function: Update UangDonasiTerkumpul when a donation is successful
CREATE OR REPLACE FUNCTION update_uang_donasi_terkumpul()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."StatusDonasi" = 'Sukses' THEN
    UPDATE "Donasi_Masjid"
    SET "UangDonasiTerkumpul" = "UangDonasiTerkumpul" + NEW."JumlahDonasi"
    WHERE id = NEW."id_donasi_masjid";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ✅ Trigger: After insert on Donasi
CREATE TRIGGER trg_update_uang_donasi_terkumpul
AFTER INSERT ON "Donasi"
FOR EACH ROW
EXECUTE FUNCTION update_uang_donasi_terkumpul();

-- ✅ Trigger Function: Update UangPengeluaran when an expense is added
CREATE OR REPLACE FUNCTION update_uang_pengeluaran()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "Donasi_Masjid"
  SET "UangPengeluaran" = "UangPengeluaran" + NEW."UangPengeluaran"
  WHERE id = NEW."id_donasi_masjid";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ✅ Trigger: After insert on Pengeluaran_Donasi_Masjid
CREATE TRIGGER trg_update_uang_pengeluaran
AFTER INSERT ON "Pengeluaran_Donasi_Masjid"
FOR EACH ROW
EXECUTE FUNCTION update_uang_pengeluaran();


make sure run this on database for the trigger

