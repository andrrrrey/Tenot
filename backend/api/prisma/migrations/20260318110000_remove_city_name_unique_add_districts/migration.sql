-- Drop unique constraint on City.name (districts can share names across cities)
ALTER TABLE "City" DROP CONSTRAINT IF EXISTS "City_name_key";

-- Insert districts for Москва
INSERT INTO "City" ("name", "type", "regionId")
SELECT 'Центральный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Северный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Северо-Восточный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Восточный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Юго-Восточный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Южный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Юго-Западный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Западный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Северо-Западный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Зеленоградский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Новомосковский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва'
UNION ALL
SELECT 'Троицкий', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Москва';

-- Insert districts for Санкт-Петербург
INSERT INTO "City" ("name", "type", "regionId")
SELECT 'Адмиралтейский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Василеостровский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Выборгский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Калининский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Кировский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Колпинский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Красногвардейский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Красносельский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Кронштадтский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Курортный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Московский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Невский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Петроградский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Петродворцовый', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Приморский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Пушкинский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Фрунзенский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург'
UNION ALL
SELECT 'Центральный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Санкт-Петербург';

-- Insert districts for Новосибирск
INSERT INTO "City" ("name", "type", "regionId")
SELECT 'Дзержинский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Новосибирск'
UNION ALL
SELECT 'Железнодорожный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Новосибирск'
UNION ALL
SELECT 'Заельцовский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Новосибирск'
UNION ALL
SELECT 'Калининский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Новосибирск'
UNION ALL
SELECT 'Кировский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Новосибирск'
UNION ALL
SELECT 'Ленинский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Новосибирск'
UNION ALL
SELECT 'Октябрьский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Новосибирск'
UNION ALL
SELECT 'Первомайский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Новосибирск'
UNION ALL
SELECT 'Советский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Новосибирск'
UNION ALL
SELECT 'Центральный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Новосибирск';

-- Insert districts for Екатеринбург
INSERT INTO "City" ("name", "type", "regionId")
SELECT 'Верх-Исетский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Екатеринбург'
UNION ALL
SELECT 'Железнодорожный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Екатеринбург'
UNION ALL
SELECT 'Кировский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Екатеринбург'
UNION ALL
SELECT 'Ленинский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Екатеринбург'
UNION ALL
SELECT 'Октябрьский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Екатеринбург'
UNION ALL
SELECT 'Орджоникидзевский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Екатеринбург'
UNION ALL
SELECT 'Чкаловский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Екатеринбург';

-- Insert districts for Казань
INSERT INTO "City" ("name", "type", "regionId")
SELECT 'Авиастроительный', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Казань'
UNION ALL
SELECT 'Вахитовский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Казань'
UNION ALL
SELECT 'Кировский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Казань'
UNION ALL
SELECT 'Московский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Казань'
UNION ALL
SELECT 'Ново-Савиновский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Казань'
UNION ALL
SELECT 'Приволжский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Казань'
UNION ALL
SELECT 'Советский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Казань';

-- Insert districts for Нижний Новгород
INSERT INTO "City" ("name", "type", "regionId")
SELECT 'Автозаводский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Нижний Новгород'
UNION ALL
SELECT 'Канавинский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Нижний Новгород'
UNION ALL
SELECT 'Ленинский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Нижний Новгород'
UNION ALL
SELECT 'Московский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Нижний Новгород'
UNION ALL
SELECT 'Нижегородский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Нижний Новгород'
UNION ALL
SELECT 'Приокский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Нижний Новгород'
UNION ALL
SELECT 'Советский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Нижний Новгород'
UNION ALL
SELECT 'Сормовский', 'DISTRICT'::"CityType", id FROM "City" WHERE name = 'Нижний Новгород';
