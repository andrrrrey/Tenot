-- Ранжирование выдачи (п. 2.13): индекс под фильтр опубликованных объявлений и флаг 360°
CREATE INDEX IF NOT EXISTS "Listing_status_isActive_has360_idx" ON "Listing"("status", "isActive", "has360");
