import 'package:flutter/material.dart';

import '../api/api.dart';
import '../api/models.dart';
import 'common.dart';

/// Категория с полным путём «Родитель › Дочерняя».
class CategoryOption {
  final Category category;
  final String path;
  CategoryOption(this.category, this.path);
}

List<CategoryOption> flattenCategories(List<Category> tree, [String prefix = '']) {
  final out = <CategoryOption>[];
  for (final c in tree) {
    final path = prefix.isEmpty ? c.name : '$prefix › ${c.name}';
    out.add(CategoryOption(c, path));
    out.addAll(flattenCategories(c.children, path));
  }
  return out;
}

List<Category>? _categoriesCache;

Future<CategoryOption?> pickCategory(BuildContext context, Api api, {bool leafOnly = false}) {
  return pickFromList<CategoryOption>(
    context,
    title: 'Категория',
    load: (_) async {
      _categoriesCache ??= await api.categories();
      final all = flattenCategories(_categoriesCache!);
      return leafOnly ? all.where((o) => o.category.children.isEmpty).toList() : all;
    },
    label: (o) => o.category.name,
    subtitle: (o) => o.path.contains('›') ? o.path : null,
  );
}

/// Выбор города через /cities/search. Возвращает City.all() для «Все города».
Future<City?> pickCity(BuildContext context, Api api, {bool allowAll = true}) {
  return pickFromList<City>(
    context,
    title: 'Город',
    remoteSearch: true,
    load: (q) async {
      final found = await api.searchCities(q.trim());
      return [if (allowAll && q.trim().isEmpty) const City.all(), ...found];
    },
    label: (c) => c.name,
    subtitle: (c) => c.id == 0 ? null : (c.regionName ?? (c.type == 'REGION' ? 'Регион' : null)),
  );
}

List<IdName>? _makesCache;

Future<IdName?> pickCarMake(BuildContext context, Api api) => pickFromList<IdName>(
      context,
      title: 'Марка',
      load: (_) async => _makesCache ??= await api.carMakes(),
      label: (m) => m.name,
    );

Future<CarModel?> pickCarModel(BuildContext context, Api api, int makeId) => pickFromList<CarModel>(
      context,
      title: 'Модель',
      load: (_) => api.carModels(makeId),
      label: (m) => m.label,
    );
