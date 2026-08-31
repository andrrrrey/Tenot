import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const sources = [
  ['BUSINESS', 'Бизнес и оборудование', 'Бизнес и оборудование.md'],
  ['HOME', 'Для дома и дачи', 'Для дома и дачи.md'],
  ['ANIMALS', 'Животные', 'Животные.md'],
  ['PERSONAL', 'Личные вещи', 'Личные вещи.md'],
  ['REAL_ESTATE', 'Недвижимость', 'Недвижимость.md'],
  ['JOBS', 'Работа', 'Работа.md'],
  ['TRANSPORT', 'Транспорт', 'Трансопрт.md'],
  ['SERVICES', 'Услуги', 'Услуги.md'],
  ['HOBBY', 'Хобби и отдых', 'Хобби и отдых.md'],
  ['ELECTRONICS', 'Электроника', 'Электроника.md'],
];

const ignored = new Set([
  'Цена, ₽', 'Стоимость, ₽', 'Зарплата, ₽', 'Желаемый доход, ₽',
  'Продавцы', 'Исполнители', 'Способы связи', 'Слова в описании',
  'Дополнительно', 'Акции', 'Наличие', 'Доступность', 'Часто ищут',
  'Рейтинг продавца', 'Рейтинг исполнителя', 'Скрыть объявления',
]);

const knownSelects = new Map([
  ['Состояние', ['Новое', 'Б/у']],
  ['Пол', ['Мужской', 'Женский']],
  ['Руль', ['Левый', 'Правый']],
  ['Коробка передач', ['Механическая', 'Автоматическая', 'Робот', 'Вариатор']],
  ['Привод', ['Передний', 'Задний', 'Полный']],
  ['Тип двигателя', ['Бензин', 'Дизель', 'Газ', 'Гибрид', 'Электро']],
]);

const numberPattern = /(цена|стоимость|доход|зарплат|площад|мощност|длин|ширин|высот|вес|объ[её]м|пробег|год выпуска|год постройки|количество|число мест|диаметр|расстояние|этаж$|этажей|клиренс|скорость|расход топлива|разгон|память|напряжение|частота|ёмкость)/i;

function stableId(value) {
  return createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function fieldKey(label) {
  const normalized = label.toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
  return normalized || `field_${stableId(label)}`;
}

function unitFor(label) {
  const match = label.match(/(?:,\s*|\()([₽%²³a-zа-я]+)\)?$/i);
  return match?.[1] || null;
}

function fieldFrom(label, order) {
  const options = knownSelects.get(label);
  return {
    key: fieldKey(label),
    label,
    type: options ? 'SELECT' : numberPattern.test(label) ? 'NUMBER' : 'TEXT',
    unit: unitFor(label),
    options: options || null,
    required: false,
    filterable: true,
    showInForm: true,
    sortOrder: order,
  };
}

function parseFile(profile, rootName, path) {
  const root = { name: rootName, templateKey: `root:${profile}`, fields: [], children: [] };
  const stack = [{ level: 0, node: root, path: rootName }];

  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const heading = rawLine.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      const level = heading[1].length;
      const name = heading[2].replace(/\\$/, '').trim();
      if (!name) continue;
      while (stack.length && stack.at(-1).level >= level) stack.pop();
      const parent = stack.at(-1) || stack[0];
      const fullPath = `${parent.path}/${name}`;
      let node = parent.node.children.find((child) => child.name === name);
      if (!node) {
        node = {
          name,
          templateKey: `${profile.toLowerCase()}:${stableId(fullPath)}`,
          fields: [],
          children: [],
        };
        parent.node.children.push(node);
      }
      stack.push({ level, node, path: fullPath });
      continue;
    }

    const label = rawLine.trim();
    if (!label || ignored.has(label) || stack.length === 1) continue;
    const fields = stack.at(-1).node.fields;
    if (!fields.some((field) => field.label === label)) {
      fields.push(fieldFrom(label, fields.length));
    }
  }

  return { profile, name: rootName, source: basename(path), root };
}

const sourceDir = resolve(process.argv[2] || '.');
const outputPath = resolve(process.argv[3] || 'src/categories/filter-templates.generated.json');
const templates = sources.map(([profile, name, file]) =>
  parseFile(profile, name, resolve(sourceDir, file)),
);

writeFileSync(outputPath, `${JSON.stringify(templates)}\n`);
console.log(`Generated ${templates.length} templates in ${outputPath}`);
