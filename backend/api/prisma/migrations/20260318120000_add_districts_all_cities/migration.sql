-- Add districts for all major Russian cities
-- Uses subqueries to find city IDs, so order-independent
-- Москва, Санкт-Петербург, Новосибирск, Екатеринбург, Казань, Нижний Новгород already seeded

-- Челябинск (7 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Калининский'), ('Курчатовский'), ('Ленинский'),
  ('Металлургический'), ('Советский'), ('Тракторозаводский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Челябинск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Самара (9 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Кировский'), ('Красноглинский'), ('Куйбышевский'),
  ('Ленинский'), ('Октябрьский'), ('Промышленный'), ('Самарский'), ('Советский')
) AS d(name) ON true
WHERE c.name = 'Самара' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Омск (5 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Кировский'), ('Ленинский'), ('Октябрьский'), ('Советский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Омск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Ростов-на-Дону (8 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Кировский'), ('Ленинский'), ('Октябрьский'),
  ('Первомайский'), ('Пролетарский'), ('Советский'), ('Фрунзенский')
) AS d(name) ON true
WHERE c.name = 'Ростов-на-Дону' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Уфа (7 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Демский'), ('Калининский'), ('Кировский'), ('Ленинский'),
  ('Октябрьский'), ('Орджоникидзевский'), ('Советский')
) AS d(name) ON true
WHERE c.name = 'Уфа' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Красноярск (7 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Кировский'), ('Ленинский'), ('Октябрьский'),
  ('Свердловский'), ('Советский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Красноярск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Воронеж (6 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Коминтерновский'), ('Левобережный'),
  ('Ленинский'), ('Советский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Воронеж' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Пермь (7 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Дзержинский'), ('Индустриальный'), ('Кировский'), ('Ленинский'),
  ('Мотовилихинский'), ('Орджоникидзевский'), ('Свердловский')
) AS d(name) ON true
WHERE c.name = 'Пермь' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Волгоград (8 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Дзержинский'), ('Кировский'), ('Красноармейский'), ('Краснооктябрьский'),
  ('Ленинский'), ('Советский'), ('Тракторозаводский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Волгоград' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Краснодар (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Западный'), ('Карасунский'), ('Прикубанский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Краснодар' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Саратов (6 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Волжский'), ('Заводской'), ('Кировский'),
  ('Ленинский'), ('Октябрьский'), ('Фрунзенский')
) AS d(name) ON true
WHERE c.name = 'Саратов' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Тюмень (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Калининский'), ('Ленинский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Тюмень' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Тольятти (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Автозаводский'), ('Комсомольский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Тольятти' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Ижевск (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Индустриальный'), ('Ленинский'), ('Октябрьский'), ('Первомайский')
) AS d(name) ON true
WHERE c.name = 'Ижевск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Барнаул (5 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Индустриальный'), ('Ленинский'), ('Октябрьский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Барнаул' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Ульяновск (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Заволжский'), ('Засвияжский'), ('Ленинский')
) AS d(name) ON true
WHERE c.name = 'Ульяновск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Иркутск (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Кировский'), ('Октябрьский'), ('Правобережный'), ('Свердловский')
) AS d(name) ON true
WHERE c.name = 'Иркутск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Хабаровск (5 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Индустриальный'), ('Кировский'), ('Краснофлотский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Хабаровск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Ярославль (6 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Дзержинский'), ('Заволжский'), ('Кировский'),
  ('Красноперекопский'), ('Ленинский'), ('Фрунзенский')
) AS d(name) ON true
WHERE c.name = 'Ярославль' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Владивосток (5 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Первореченский'), ('Первомайский'), ('Советский'), ('Фрунзенский')
) AS d(name) ON true
WHERE c.name = 'Владивосток' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Махачкала (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Кировский'), ('Ленинский'), ('Советский')
) AS d(name) ON true
WHERE c.name = 'Махачкала' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Томск (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Кировский'), ('Ленинский'), ('Октябрьский'), ('Советский')
) AS d(name) ON true
WHERE c.name = 'Томск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Оренбург (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Дзержинский'), ('Ленинский'), ('Промышленный'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Оренбург' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Кемерово (5 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Заводский'), ('Кировский'), ('Ленинский'), ('Рудничный'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Кемерово' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Новокузнецк (6 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Заводский'), ('Кузнецкий'), ('Куйбышевский'),
  ('Новоильинский'), ('Орджоникидзевский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Новокузнецк' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Рязань (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Московский'), ('Октябрьский'), ('Советский')
) AS d(name) ON true
WHERE c.name = 'Рязань' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Астрахань (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Кировский'), ('Ленинский'), ('Советский'), ('Трусовский')
) AS d(name) ON true
WHERE c.name = 'Астрахань' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Пенза (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Ленинский'), ('Октябрьский'), ('Первомайский')
) AS d(name) ON true
WHERE c.name = 'Пенза' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Тула (5 районов)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Зареченский'), ('Привокзальный'), ('Пролетарский'), ('Советский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Тула' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Киров (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Нововятский'), ('Октябрьский'), ('Первомайский')
) AS d(name) ON true
WHERE c.name = 'Киров' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Чебоксары (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Калининский'), ('Ленинский'), ('Московский')
) AS d(name) ON true
WHERE c.name = 'Чебоксары' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Калининград (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинградский'), ('Московский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Калининград' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Брянск (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Бежицкий'), ('Володарский'), ('Советский'), ('Фокинский')
) AS d(name) ON true
WHERE c.name = 'Брянск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Курск (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Кировский'), ('Сеймский')
) AS d(name) ON true
WHERE c.name = 'Курск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Иваново (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Октябрьский'), ('Советский'), ('Фрунзенский')
) AS d(name) ON true
WHERE c.name = 'Иваново' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Магнитогорск (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Левобережный'), ('Орджоникидзевский'), ('Правобережный')
) AS d(name) ON true
WHERE c.name = 'Магнитогорск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Улан-Удэ (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Октябрьский'), ('Советский')
) AS d(name) ON true
WHERE c.name = 'Улан-Удэ' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Тверь (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Заволжский'), ('Московский'), ('Пролетарский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Тверь' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Ставрополь (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Октябрьский'), ('Промышленный')
) AS d(name) ON true
WHERE c.name = 'Ставрополь' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Белгород (2 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Восточный'), ('Западный')
) AS d(name) ON true
WHERE c.name = 'Белгород' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Архангельск (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Исакогорский'), ('Ломоносовский'), ('Майская Горка'), ('Октябрьский')
) AS d(name) ON true
WHERE c.name = 'Архангельск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Владимир (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Октябрьский'), ('Фрунзенский')
) AS d(name) ON true
WHERE c.name = 'Владимир' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Сочи (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Адлерский'), ('Лазаревский'), ('Хостинский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Сочи' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Смоленск (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Заднепровский'), ('Ленинский'), ('Промышленный')
) AS d(name) ON true
WHERE c.name = 'Смоленск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Чита (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Ингодинский'), ('Читинский'), ('Черновский')
) AS d(name) ON true
WHERE c.name = 'Чита' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Орёл (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Железнодорожный'), ('Заводской'), ('Северный'), ('Советский')
) AS d(name) ON true
WHERE c.name = 'Орёл' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Мурманск (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Октябрьский'), ('Первомайский')
) AS d(name) ON true
WHERE c.name = 'Мурманск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Вологда (2 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Советский')
) AS d(name) ON true
WHERE c.name = 'Вологда' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Саранск (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Октябрьский'), ('Пролетарский')
) AS d(name) ON true
WHERE c.name = 'Саранск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Тамбов (2 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Октябрьский')
) AS d(name) ON true
WHERE c.name = 'Тамбов' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Грозный (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Заводский'), ('Ленинский'), ('Октябрьский'), ('Старопромысловский')
) AS d(name) ON true
WHERE c.name = 'Грозный' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Якутск (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Губинский'), ('Октябрьский'), ('Строительный')
) AS d(name) ON true
WHERE c.name = 'Якутск' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Владикавказ (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Иристонский'), ('Затеречный'), ('Промышленный'), ('Советский')
) AS d(name) ON true
WHERE c.name = 'Владикавказ' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Нальчик (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Советский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Нальчик' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Кострома (4 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Октябрьский'), ('Свердловский'), ('Фабричный')
) AS d(name) ON true
WHERE c.name = 'Кострома' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Комсомольск-на-Амуре (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Центральный'), ('Кировский')
) AS d(name) ON true
WHERE c.name = 'Комсомольск-на-Амуре' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Нижний Тагил (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Горнозаводской'), ('Дзержинский'), ('Тагилстроевский')
) AS d(name) ON true
WHERE c.name = 'Нижний Тагил' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Стерлитамак (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Восточный'), ('Западный'), ('Северный')
) AS d(name) ON true
WHERE c.name = 'Стерлитамак' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Сыктывкар (2 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Эжвинский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Сыктывкар' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Набережные Челны (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Автозаводский'), ('Комсомольский'), ('Центральный')
) AS d(name) ON true
WHERE c.name = 'Набережные Челны' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);

-- Калуга (3 района)
INSERT INTO "City" ("name", "type", "regionId")
SELECT d.name, 'DISTRICT'::"CityType", c.id
FROM "City" c
JOIN (VALUES
  ('Ленинский'), ('Московский'), ('Октябрьский')
) AS d(name) ON true
WHERE c.name = 'Калуга' AND NOT EXISTS (
  SELECT 1 FROM "City" x WHERE x.name = d.name AND x."regionId" = c.id AND x.type = 'DISTRICT'
);
