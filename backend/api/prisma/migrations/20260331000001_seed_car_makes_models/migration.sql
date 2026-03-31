-- ============================================================
-- Seed: Car Makes and Models
-- ============================================================

INSERT INTO "CarMake" ("name") VALUES
  ('LADA (ВАЗ)'),
  ('ГАЗ'),
  ('УАЗ'),
  ('Москвич'),
  ('KIA'),
  ('Hyundai'),
  ('Toyota'),
  ('Volkswagen'),
  ('BMW'),
  ('Mercedes-Benz'),
  ('Audi'),
  ('Nissan'),
  ('Renault'),
  ('Ford'),
  ('Mazda'),
  ('Honda'),
  ('Mitsubishi'),
  ('Subaru'),
  ('Lexus'),
  ('Land Rover'),
  ('Porsche'),
  ('Jeep'),
  ('Chevrolet'),
  ('Skoda'),
  ('Peugeot'),
  ('Citroen'),
  ('Opel'),
  ('Volvo'),
  ('Geely'),
  ('Chery'),
  ('Haval'),
  ('BYD'),
  ('Suzuki'),
  ('Seat'),
  ('Alfa Romeo'),
  ('Fiat'),
  ('Dodge'),
  ('Cadillac'),
  ('Infiniti'),
  ('Acura'),
  ('Genesis'),
  ('Changan'),
  ('Omoda'),
  ('Exeed'),
  ('Jetour')
ON CONFLICT ("name") DO NOTHING;

-- ============================================================
-- Models by Make
-- ============================================================

-- LADA (ВАЗ)
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('2101',       1970, 1988),
  ('2102',       1971, 1985),
  ('2103',       1972, 1984),
  ('2104',       1984, 2012),
  ('2105',       1980, 2010),
  ('2106',       1976, 2006),
  ('2107',       1982, 2012),
  ('2108',       1984, 2013),
  ('2109',       1987, 2011),
  ('21099',      1990, 2011),
  ('2110',       1996, 2014),
  ('2111',       1998, 2009),
  ('2112',       1999, 2009),
  ('2113',       2004, 2013),
  ('2114',       2001, 2013),
  ('2115',       1997, 2012),
  ('Priora',     2007, 2018),
  ('Kalina',     2004, 2018),
  ('Granta',     2011, NULL),
  ('Vesta',      2015, NULL),
  ('XRAY',       2016, NULL),
  ('Largus',     2012, NULL),
  ('Niva Legend',1977, NULL),
  ('Niva Travel',2021, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'LADA (ВАЗ)'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- ГАЗ
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Волга 21',      1956, 1970),
  ('Волга 24',      1970, 1992),
  ('Волга 3110',    1997, 2004),
  ('Волга 31105',   2004, 2009),
  ('Газель',        1994, NULL),
  ('Газель Next',   2013, NULL),
  ('Газель Бизнес', 2010, NULL),
  ('Соболь',        1998, NULL),
  ('ГАЗон Next',    2014, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'ГАЗ'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- УАЗ
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Буханка (452)',  1965, NULL),
  ('Хантер',        2003, NULL),
  ('Патриот',       2005, NULL),
  ('Пикап',         2008, NULL),
  ('Профи',         2017, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'УАЗ'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Москвич
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('412',     1967, 1998),
  ('2140',    1976, 1988),
  ('2141',    1986, 1998),
  ('3',       2023, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Москвич'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- KIA
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Rio',          2000, NULL),
  ('Ceed',         2006, NULL),
  ('Sportage',     1993, NULL),
  ('Sorento',      2002, NULL),
  ('Soul',         2008, NULL),
  ('Stinger',      2017, NULL),
  ('K5',           2020, NULL),
  ('Seltos',       2019, NULL),
  ('Carnival',     1998, NULL),
  ('Telluride',    2019, NULL),
  ('EV6',          2021, NULL),
  ('Cerato',       2003, NULL),
  ('Optima',       2000, 2020),
  ('Mohave',       2008, NULL),
  ('Picanto',      2004, NULL),
  ('Xceed',        2019, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'KIA'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Hyundai
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Solaris',      2010, NULL),
  ('Elantra',      1990, NULL),
  ('Tucson',       2004, NULL),
  ('Santa Fe',     2000, NULL),
  ('Creta',        2015, NULL),
  ('i30',          2007, NULL),
  ('i20',          2008, NULL),
  ('Sonata',       1985, NULL),
  ('Accent',       1994, 2017),
  ('Getz',         2002, 2011),
  ('ix35',         2009, 2015),
  ('Starex',       1997, NULL),
  ('Palisade',     2018, NULL),
  ('IONIQ 5',      2021, NULL),
  ('IONIQ 6',      2022, NULL),
  ('Staria',       2021, NULL),
  ('Kona',         2017, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Hyundai'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Toyota
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Camry',         1982, NULL),
  ('Corolla',       1966, NULL),
  ('Land Cruiser',  1951, NULL),
  ('Land Cruiser Prado', 1984, NULL),
  ('RAV4',          1994, NULL),
  ('Highlander',    2000, NULL),
  ('Yaris',         1999, NULL),
  ('Prius',         1997, NULL),
  ('Hilux',         1968, NULL),
  ('Fortuner',      2005, NULL),
  ('Avensis',       1997, 2018),
  ('Auris',         2006, 2019),
  ('Verso',         2009, 2018),
  ('Alphard',       2002, NULL),
  ('Venza',         2008, NULL),
  ('C-HR',          2016, NULL),
  ('GR86',          2021, NULL),
  ('bZ4X',          2022, NULL),
  ('4Runner',       1984, NULL),
  ('Sequoia',       2000, NULL),
  ('Tundra',        1999, NULL),
  ('Tacoma',        1995, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Toyota'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Volkswagen
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Polo',        1975, NULL),
  ('Golf',        1974, NULL),
  ('Passat',      1973, NULL),
  ('Tiguan',      2007, NULL),
  ('Touareg',     2002, NULL),
  ('Jetta',       1979, NULL),
  ('Beetle',      1998, 2019),
  ('Sharan',      1995, NULL),
  ('Transporter', 1950, NULL),
  ('Caddy',       1980, NULL),
  ('Arteon',      2017, NULL),
  ('Taos',        2020, NULL),
  ('Amarok',      2010, NULL),
  ('ID.4',        2020, NULL),
  ('ID.6',        2021, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Volkswagen'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- BMW
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('1 серия',  2004, NULL),
  ('2 серия',  2013, NULL),
  ('3 серия',  1975, NULL),
  ('4 серия',  2013, NULL),
  ('5 серия',  1972, NULL),
  ('6 серия',  1976, NULL),
  ('7 серия',  1977, NULL),
  ('8 серия',  1989, NULL),
  ('X1',       2009, NULL),
  ('X2',       2018, NULL),
  ('X3',       2003, NULL),
  ('X4',       2014, NULL),
  ('X5',       1999, NULL),
  ('X6',       2008, NULL),
  ('X7',       2018, NULL),
  ('M3',       1986, NULL),
  ('M5',       1984, NULL),
  ('iX',       2021, NULL),
  ('i4',       2021, NULL),
  ('Z4',       2002, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'BMW'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Mercedes-Benz
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('A-класс',      1997, NULL),
  ('B-класс',      2005, NULL),
  ('C-класс',      1993, NULL),
  ('CLA',          2013, NULL),
  ('CLS',          2004, NULL),
  ('E-класс',      1984, NULL),
  ('GLA',          2013, NULL),
  ('GLB',          2019, NULL),
  ('GLC',          2015, NULL),
  ('GLE',          2015, NULL),
  ('GLS',          2012, NULL),
  ('S-класс',      1954, NULL),
  ('G-класс',      1979, NULL),
  ('Sprinter',     1995, NULL),
  ('Vito',         1996, NULL),
  ('V-класс',      1996, NULL),
  ('AMG GT',       2014, NULL),
  ('EQC',          2019, NULL),
  ('EQS',          2021, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Mercedes-Benz'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Audi
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('A1',    2010, NULL),
  ('A3',    1996, NULL),
  ('A4',    1994, NULL),
  ('A5',    2007, NULL),
  ('A6',    1994, NULL),
  ('A7',    2010, NULL),
  ('A8',    1994, NULL),
  ('Q2',    2016, NULL),
  ('Q3',    2011, NULL),
  ('Q4',    2021, NULL),
  ('Q5',    2008, NULL),
  ('Q7',    2005, NULL),
  ('Q8',    2018, NULL),
  ('TT',    1998, NULL),
  ('R8',    2006, NULL),
  ('e-tron',2019, NULL),
  ('S3',    1999, NULL),
  ('S4',    1991, NULL),
  ('S5',    2007, NULL),
  ('S6',    1994, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Audi'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Nissan
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Qashqai',    2006, NULL),
  ('X-Trail',    2001, NULL),
  ('Almera',     1995, 2018),
  ('Almera Classic', 2006, 2013),
  ('Patrol',     1980, NULL),
  ('Teana',      2003, 2014),
  ('Note',       2005, NULL),
  ('Juke',       2010, NULL),
  ('Murano',     2002, NULL),
  ('Pathfinder', 1986, NULL),
  ('Navara',     1986, NULL),
  ('GT-R',       2007, NULL),
  ('370Z',       2009, NULL),
  ('Leaf',       2010, NULL),
  ('Ariya',      2021, NULL),
  ('Tiida',      2004, 2014),
  ('Primera',    1990, 2007),
  ('Sentra',     1982, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Nissan'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Renault
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Logan',      2004, NULL),
  ('Duster',     2010, NULL),
  ('Sandero',    2007, NULL),
  ('Megane',     1995, NULL),
  ('Fluence',    2009, 2017),
  ('Kaptur',     2016, NULL),
  ('Arkana',     2019, NULL),
  ('Koleos',     2008, NULL),
  ('Clio',       1990, NULL),
  ('Symbol',     1998, NULL),
  ('Laguna',     1993, 2015),
  ('Scenic',     1996, NULL),
  ('Espace',     1984, NULL),
  ('Master',     1980, NULL),
  ('Kangoo',     1997, NULL),
  ('Trafic',     1980, NULL),
  ('Zoe',        2012, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Renault'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Ford
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Focus',     1998, NULL),
  ('Mondeo',    1992, NULL),
  ('Explorer',  1991, NULL),
  ('Kuga',      2008, NULL),
  ('Ranger',    1983, NULL),
  ('Mustang',   1964, NULL),
  ('EcoSport',  2003, NULL),
  ('Edge',      2006, NULL),
  ('Fiesta',    1976, 2023),
  ('Puma',      2019, NULL),
  ('Bronco',    2021, NULL),
  ('F-150',     1975, NULL),
  ('Transit',   1965, NULL),
  ('Galaxy',    1995, NULL),
  ('S-Max',     2006, NULL),
  ('Fusion',    2002, 2020)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Ford'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Mazda
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Mazda 3',    2003, NULL),
  ('Mazda 6',    2002, NULL),
  ('CX-3',       2015, NULL),
  ('CX-5',       2012, NULL),
  ('CX-7',       2006, 2012),
  ('CX-9',       2007, NULL),
  ('CX-30',      2019, NULL),
  ('CX-60',      2022, NULL),
  ('MX-5',       1989, NULL),
  ('RX-8',       2003, 2012),
  ('Mazda 2',    2002, NULL),
  ('BT-50',      2006, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Mazda'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Honda
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Civic',      1972, NULL),
  ('Accord',     1976, NULL),
  ('CR-V',       1995, NULL),
  ('HR-V',       1998, NULL),
  ('Fit',        2001, NULL),
  ('Pilot',      2002, NULL),
  ('Jazz',       2001, NULL),
  ('FR-V',       2004, 2010),
  ('Ridgeline',  2005, NULL),
  ('e:NY1',      2023, NULL),
  ('ZR-V',       2022, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Honda'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Mitsubishi
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Outlander',       2001, NULL),
  ('Pajero',          1982, NULL),
  ('Pajero Sport',    1996, NULL),
  ('Lancer',          1973, 2017),
  ('ASX',             2010, NULL),
  ('Eclipse Cross',   2017, NULL),
  ('L200',            1978, NULL),
  ('Galant',          1969, 2012),
  ('Grandis',         2003, 2011),
  ('Carisma',         1995, 2004),
  ('Colt',            1962, 2012),
  ('i-MiEV',          2009, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Mitsubishi'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Subaru
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Forester',   1997, NULL),
  ('Outback',    1995, NULL),
  ('Impreza',    1992, NULL),
  ('Legacy',     1989, NULL),
  ('XV',         2011, NULL),
  ('WRX',        1992, NULL),
  ('BRZ',        2012, NULL),
  ('Solterra',   2022, NULL),
  ('Crosstrek',  2012, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Subaru'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Lexus
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('RX',    1998, NULL),
  ('LX',    1996, NULL),
  ('ES',    1989, NULL),
  ('IS',    1998, NULL),
  ('GX',    2002, NULL),
  ('NX',    2014, NULL),
  ('UX',    2018, NULL),
  ('GS',    1991, 2020),
  ('LS',    1989, NULL),
  ('RC',    2014, NULL),
  ('LC',    2017, NULL),
  ('TX',    2023, NULL),
  ('RZ',    2022, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Lexus'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Land Rover
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Discovery',         1989, NULL),
  ('Discovery Sport',   2014, NULL),
  ('Defender',          1983, NULL),
  ('Range Rover',       1970, NULL),
  ('Range Rover Sport', 2005, NULL),
  ('Range Rover Evoque',2011, NULL),
  ('Range Rover Velar', 2017, NULL),
  ('Freelander',        1997, 2014)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Land Rover'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Porsche
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Cayenne',    2002, NULL),
  ('Macan',      2014, NULL),
  ('Panamera',   2009, NULL),
  ('911',        1963, NULL),
  ('Taycan',     2019, NULL),
  ('718',        2016, NULL),
  ('Cayenne E-Hybrid', 2010, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Porsche'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Jeep
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Grand Cherokee', 1992, NULL),
  ('Wrangler',       1987, NULL),
  ('Compass',        2006, NULL),
  ('Cherokee',       1974, NULL),
  ('Renegade',       2014, NULL),
  ('Gladiator',      2019, NULL),
  ('Commander',      2005, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Jeep'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Chevrolet
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Niva',       2002, NULL),
  ('Cruze',      2008, 2019),
  ('Captiva',    2006, 2018),
  ('Spark',      1998, NULL),
  ('Lacetti',    2002, 2013),
  ('Aveo',       2002, 2015),
  ('Orlando',    2010, 2018),
  ('Cobalt',     2011, NULL),
  ('Tahoe',      1995, NULL),
  ('Suburban',   1935, NULL),
  ('Traverse',   2008, NULL),
  ('Equinox',    2004, NULL),
  ('Trailblazer',2001, NULL),
  ('Camaro',     1966, NULL),
  ('Corvette',   1953, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Chevrolet'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Skoda
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Octavia',    1959, NULL),
  ('Superb',     2001, NULL),
  ('Rapid',      2012, NULL),
  ('Kodiaq',     2016, NULL),
  ('Karoq',      2017, NULL),
  ('Fabia',      1999, NULL),
  ('Scala',      2019, NULL),
  ('Enyaq',      2020, NULL),
  ('Kamiq',      2019, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Skoda'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Peugeot
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('206',    1998, 2010),
  ('207',    2006, 2012),
  ('208',    2012, NULL),
  ('301',    2012, NULL),
  ('307',    2001, 2008),
  ('308',    2007, NULL),
  ('408',    2022, NULL),
  ('3008',   2009, NULL),
  ('5008',   2009, NULL),
  ('2008',   2013, NULL),
  ('4008',   2012, 2017),
  ('508',    2010, NULL),
  ('Expert', 1995, NULL),
  ('Boxer',  1975, NULL),
  ('Partner',1996, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Peugeot'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Citroen
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('C3',       2002, NULL),
  ('C4',       2004, NULL),
  ('C4 Cactus',2014, 2021),
  ('C5',       2001, NULL),
  ('C5 X',     2021, NULL),
  ('C3 Aircross', 2017, NULL),
  ('C5 Aircross', 2017, NULL),
  ('Berlingo',    1996, NULL),
  ('Jumper',      1994, NULL),
  ('Jumpy',       1994, NULL),
  ('Spacetourer', 2016, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Citroen'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Opel
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Astra',      1991, NULL),
  ('Vectra',     1988, 2009),
  ('Zafira',     1999, 2019),
  ('Insignia',   2008, NULL),
  ('Mokka',      2012, NULL),
  ('Grandland',  2017, NULL),
  ('Crossland',  2017, NULL),
  ('Omega',      1986, 2003),
  ('Corsa',      1982, NULL),
  ('Cascada',    2013, 2019),
  ('Meriva',     2003, 2017),
  ('Antara',     2006, 2015),
  ('Vivaro',     2001, NULL),
  ('Movano',     1998, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Opel'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Volvo
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('XC60',   2008, NULL),
  ('XC90',   2002, NULL),
  ('XC40',   2017, NULL),
  ('S60',    2000, NULL),
  ('S90',    1990, NULL),
  ('V40',    2012, 2019),
  ('V60',    2010, NULL),
  ('V90',    2016, NULL),
  ('C40',    2021, NULL),
  ('EX30',   2023, NULL),
  ('EX90',   2023, NULL),
  ('850',    1991, 1997),
  ('940',    1990, 1998),
  ('960',    1990, 1997)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Volvo'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Geely
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Atlas',     2016, NULL),
  ('Atlas Pro', 2021, NULL),
  ('Coolray',   2019, NULL),
  ('Tugella',   2020, NULL),
  ('Emgrand',   2009, NULL),
  ('Monjaro',   2022, NULL),
  ('Galaxy L7', 2023, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Geely'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Chery
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Tiggo 4',    2017, NULL),
  ('Tiggo 7',    2016, NULL),
  ('Tiggo 7 Pro',2020, NULL),
  ('Tiggo 8',    2018, NULL),
  ('Tiggo 8 Pro',2021, NULL),
  ('Arrizo 5',   2016, NULL),
  ('Arrizo 8',   2022, NULL),
  ('QQ',         2003, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Chery'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Haval
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('F7',        2018, NULL),
  ('F7x',       2019, NULL),
  ('Jolion',    2021, NULL),
  ('H6',        2011, NULL),
  ('Dargo',     2021, NULL),
  ('M6',        2021, NULL),
  ('H9',        2020, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Haval'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- BYD
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Han',      2020, NULL),
  ('Tang',     2018, NULL),
  ('Song Plus',2021, NULL),
  ('Atto 3',   2021, NULL),
  ('Seal',     2022, NULL),
  ('Dolphin',  2021, NULL),
  ('Sea Lion', 2023, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'BYD'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Suzuki
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Vitara',    1988, NULL),
  ('Grand Vitara', 1998, 2017),
  ('Jimny',     1970, NULL),
  ('SX4',       2006, NULL),
  ('Swift',     1984, NULL),
  ('Alto',      1979, NULL),
  ('Ignis',     2000, NULL),
  ('Baleno',    1994, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Suzuki'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Seat
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Ibiza',      1984, NULL),
  ('Leon',       1999, NULL),
  ('Ateca',      2016, NULL),
  ('Tarraco',    2018, NULL),
  ('Arona',      2017, NULL),
  ('Toledo',     1991, 2019),
  ('Alhambra',   1996, 2022)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Seat'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Alfa Romeo
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Giulia',   2015, NULL),
  ('Stelvio',  2016, NULL),
  ('Tonale',   2022, NULL),
  ('156',      1997, 2007),
  ('159',      2005, 2012),
  ('147',      2001, 2010),
  ('Mito',     2008, 2018),
  ('Giulietta',2010, 2020)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Alfa Romeo'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Fiat
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Punto',      1993, 2018),
  ('Tipo',       1988, NULL),
  ('500',        1957, NULL),
  ('500X',       2014, NULL),
  ('Panda',      1980, NULL),
  ('Ducato',     1981, NULL),
  ('Doblo',      2000, NULL),
  ('Bravo',      1995, 2014),
  ('Linea',      2007, 2015)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Fiat'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Infiniti
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('Q50',    2013, NULL),
  ('Q60',    2013, NULL),
  ('QX50',   2008, NULL),
  ('QX60',   2012, NULL),
  ('QX80',   2010, NULL),
  ('FX',     2002, 2013),
  ('EX',     2007, 2013),
  ('G',      2002, 2013)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Infiniti'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Genesis
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('G70',    2017, NULL),
  ('G80',    2016, NULL),
  ('G90',    2015, NULL),
  ('GV70',   2021, NULL),
  ('GV80',   2020, NULL),
  ('GV60',   2021, NULL),
  ('Electrified G80', 2022, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Genesis'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Changan
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('CS75 Plus',  2020, NULL),
  ('CS55 Plus',  2021, NULL),
  ('CS35 Plus',  2019, NULL),
  ('Uni-T',      2020, NULL),
  ('Uni-K',      2021, NULL),
  ('Uni-V',      2022, NULL),
  ('Lamore',     2023, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Changan'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Omoda
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('C5',     2022, NULL),
  ('S5',     2023, NULL),
  ('C5 GT',  2023, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Omoda'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Exeed
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('TXL',    2019, NULL),
  ('VX',     2021, NULL),
  ('LX',     2022, NULL),
  ('RX',     2022, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Exeed'
ON CONFLICT ("name", "makeId") DO NOTHING;

-- Jetour
INSERT INTO "CarModel" ("name", "makeId", "yearFrom", "yearTo") SELECT m.name, mk.id, m.yf::int, m.yt::int FROM (VALUES
  ('X70',       2018, NULL),
  ('X70 Plus',  2020, NULL),
  ('X90',       2019, NULL),
  ('Dashing',   2022, NULL),
  ('T2',        2023, NULL)
) AS m(name, yf, yt)
JOIN "CarMake" mk ON mk.name = 'Jetour'
ON CONFLICT ("name", "makeId") DO NOTHING;
