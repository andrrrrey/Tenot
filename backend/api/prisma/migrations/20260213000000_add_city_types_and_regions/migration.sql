-- CreateEnum
CREATE TYPE "CityType" AS ENUM ('REGION', 'CITY', 'VILLAGE', 'TOWN');

-- AlterTable: add type and regionId columns
ALTER TABLE "City" ADD COLUMN "type" "CityType" NOT NULL DEFAULT 'CITY';
ALTER TABLE "City" ADD COLUMN "regionId" INTEGER;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert regions (oblasts, republics, krais, etc.)
INSERT INTO "City" ("name", "type") VALUES
('Московская область', 'REGION'),
('Ленинградская область', 'REGION'),
('Новосибирская область', 'REGION'),
('Свердловская область', 'REGION'),
('Республика Татарстан', 'REGION'),
('Нижегородская область', 'REGION'),
('Челябинская область', 'REGION'),
('Самарская область', 'REGION'),
('Омская область', 'REGION'),
('Ростовская область', 'REGION'),
('Республика Башкортостан', 'REGION'),
('Красноярский край', 'REGION'),
('Воронежская область', 'REGION'),
('Пермский край', 'REGION'),
('Волгоградская область', 'REGION'),
('Краснодарский край', 'REGION'),
('Саратовская область', 'REGION'),
('Тюменская область', 'REGION'),
('Удмуртская Республика', 'REGION'),
('Алтайский край', 'REGION'),
('Ульяновская область', 'REGION'),
('Иркутская область', 'REGION'),
('Хабаровский край', 'REGION'),
('Ярославская область', 'REGION'),
('Приморский край', 'REGION'),
('Республика Дагестан', 'REGION'),
('Томская область', 'REGION'),
('Оренбургская область', 'REGION'),
('Кемеровская область', 'REGION'),
('Рязанская область', 'REGION'),
('Астраханская область', 'REGION'),
('Пензенская область', 'REGION'),
('Липецкая область', 'REGION'),
('Тульская область', 'REGION'),
('Кировская область', 'REGION'),
('Чувашская Республика', 'REGION'),
('Калининградская область', 'REGION'),
('Брянская область', 'REGION'),
('Курская область', 'REGION'),
('Ивановская область', 'REGION'),
('Республика Бурятия', 'REGION'),
('Тверская область', 'REGION'),
('Ставропольский край', 'REGION'),
('Белгородская область', 'REGION'),
('Архангельская область', 'REGION'),
('Владимирская область', 'REGION'),
('Курганская область', 'REGION'),
('Смоленская область', 'REGION'),
('Калужская область', 'REGION'),
('Забайкальский край', 'REGION'),
('Орловская область', 'REGION'),
('Мурманская область', 'REGION'),
('Вологодская область', 'REGION'),
('Республика Мордовия', 'REGION'),
('Тамбовская область', 'REGION'),
('Чеченская Республика', 'REGION'),
('Республика Саха (Якутия)', 'REGION'),
('Костромская область', 'REGION'),
('Республика Карелия', 'REGION'),
('Ханты-Мансийский АО', 'REGION'),
('Республика Марий Эл', 'REGION'),
('Псковская область', 'REGION'),
('Республика Ингушетия', 'REGION'),
('Кабардино-Балкарская Республика', 'REGION'),
('Республика Коми', 'REGION'),
('Ямало-Ненецкий АО', 'REGION'),
('Республика Северная Осетия', 'REGION'),
('Карачаево-Черкесская Республика', 'REGION'),
('Республика Тыва', 'REGION'),
('Республика Калмыкия', 'REGION'),
('Сахалинская область', 'REGION'),
('Камчатский край', 'REGION'),
('Республика Хакасия', 'REGION'),
('Республика Адыгея', 'REGION'),
('Амурская область', 'REGION');

-- Link existing cities to their regions
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Московская область') WHERE name IN ('Балашиха', 'Химки', 'Подольск', 'Королёв', 'Мытищи', 'Люберцы', 'Коломна', 'Электросталь', 'Одинцово', 'Серпухов', 'Домодедово', 'Красногорск', 'Щёлково', 'Долгопрудный', 'Жуковский', 'Реутов', 'Обнинск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Новосибирская область') WHERE name IN ('Новосибирск', 'Бердск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Свердловская область') WHERE name IN ('Екатеринбург', 'Нижний Тагил', 'Каменск-Уральский', 'Первоуральск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Татарстан') WHERE name IN ('Казань', 'Набережные Челны', 'Нижнекамск', 'Альметьевск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Нижегородская область') WHERE name IN ('Нижний Новгород', 'Дзержинск', 'Арзамас');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Челябинская область') WHERE name IN ('Челябинск', 'Магнитогорск', 'Златоуст', 'Миасс', 'Копейск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Самарская область') WHERE name IN ('Самара', 'Тольятти', 'Сызрань');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Омская область') WHERE name = 'Омск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Ростовская область') WHERE name IN ('Ростов-на-Дону', 'Таганрог', 'Шахты', 'Волгодонск', 'Новочеркасск', 'Батайск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Башкортостан') WHERE name IN ('Уфа', 'Стерлитамак', 'Нефтекамск', 'Октябрьский');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Красноярский край') WHERE name IN ('Красноярск', 'Ачинск', 'Норильск', 'Минусинск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Воронежская область') WHERE name = 'Воронеж';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Пермский край') WHERE name = 'Пермь';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Волгоградская область') WHERE name IN ('Волгоград', 'Волжский', 'Камышин');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Краснодарский край') WHERE name IN ('Краснодар', 'Сочи', 'Новороссийск', 'Армавир', 'Анапа', 'Геленджик');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Саратовская область') WHERE name IN ('Саратов', 'Энгельс', 'Балаково');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Тюменская область') WHERE name = 'Тюмень';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Удмуртская Республика') WHERE name = 'Ижевск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Алтайский край') WHERE name IN ('Барнаул', 'Бийск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Ульяновская область') WHERE name IN ('Ульяновск', 'Димитровград');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Иркутская область') WHERE name IN ('Иркутск', 'Братск', 'Ангарск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Хабаровский край') WHERE name IN ('Хабаровск', 'Комсомольск-на-Амуре');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Ярославская область') WHERE name IN ('Ярославль', 'Рыбинск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Приморский край') WHERE name = 'Владивосток';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Дагестан') WHERE name IN ('Махачкала', 'Хасавюрт', 'Дербент', 'Каспийск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Томская область') WHERE name IN ('Томск', 'Северск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Оренбургская область') WHERE name IN ('Оренбург', 'Орск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Кемеровская область') WHERE name IN ('Кемерово', 'Новокузнецк', 'Прокопьевск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Рязанская область') WHERE name = 'Рязань';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Астраханская область') WHERE name = 'Астрахань';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Пензенская область') WHERE name = 'Пенза';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Липецкая область') WHERE name IN ('Липецк', 'Елец');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Тульская область') WHERE name IN ('Тула', 'Новомосковск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Кировская область') WHERE name = 'Киров';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Чувашская Республика') WHERE name IN ('Чебоксары', 'Новочебоксарск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Калининградская область') WHERE name = 'Калининград';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Брянская область') WHERE name = 'Брянск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Курская область') WHERE name = 'Курск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Ивановская область') WHERE name = 'Иваново';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Бурятия') WHERE name = 'Улан-Удэ';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Тверская область') WHERE name = 'Тверь';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Ставропольский край') WHERE name IN ('Ставрополь', 'Пятигорск', 'Кисловодск', 'Ессентуки', 'Невинномысск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Белгородская область') WHERE name IN ('Белгород', 'Старый Оскол');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Архангельская область') WHERE name IN ('Архангельск', 'Северодвинск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Владимирская область') WHERE name IN ('Владимир', 'Ковров', 'Муром');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Курганская область') WHERE name = 'Курган';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Смоленская область') WHERE name = 'Смоленск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Калужская область') WHERE name IN ('Калуга', 'Обнинск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Забайкальский край') WHERE name = 'Чита';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Орловская область') WHERE name = 'Орёл';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Мурманская область') WHERE name = 'Мурманск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Вологодская область') WHERE name IN ('Вологда', 'Череповец');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Мордовия') WHERE name = 'Саранск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Тамбовская область') WHERE name = 'Тамбов';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Чеченская Республика') WHERE name = 'Грозный';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Саха (Якутия)') WHERE name = 'Якутск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Костромская область') WHERE name = 'Кострома';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Карелия') WHERE name = 'Петрозаводск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Ханты-Мансийский АО') WHERE name IN ('Сургут', 'Нижневартовск', 'Нефтеюганск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Марий Эл') WHERE name = 'Йошкар-Ола';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Псковская область') WHERE name = 'Псков';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Ингушетия') WHERE name = 'Магас';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Кабардино-Балкарская Республика') WHERE name = 'Нальчик';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Коми') WHERE name = 'Сыктывкар';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Ямало-Ненецкий АО') WHERE name IN ('Новый Уренгой', 'Ноябрьск');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Северная Осетия') WHERE name = 'Владикавказ';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Карачаево-Черкесская Республика') WHERE name = 'Черкесск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Тыва') WHERE name = 'Кызыл';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Калмыкия') WHERE name = 'Элиста';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Сахалинская область') WHERE name = 'Южно-Сахалинск';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Камчатский край') WHERE name = 'Петропавловск-Камчатский';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Хакасия') WHERE name = 'Абакан';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Республика Адыгея') WHERE name = 'Майкоп';
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Амурская область') WHERE name = 'Благовещенск';

-- Remove Обнинск from Калужская (it was duplicated) — fix: Обнинск is in Калужская область, keep it there
-- Великий Новгород doesn't have a region yet — no existing Новгородская область, add it
INSERT INTO "City" ("name", "type") VALUES ('Новгородская область', 'REGION');
UPDATE "City" SET "regionId" = (SELECT id FROM "City" WHERE name = 'Новгородская область') WHERE name = 'Великий Новгород';
