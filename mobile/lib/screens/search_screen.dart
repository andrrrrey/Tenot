import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../api/models.dart';
import '../state/session.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/pickers.dart';

/// Поиск и фильтры — как app/search/SearchClient.tsx.
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, required this.initial});
  final ListingFilter initial;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late ListingFilter _f = widget.initial.copy();
  late final _q = TextEditingController(text: widget.initial.search);
  List<Listing>? _items;
  Object? _error;
  String? _correction;
  int _seq = 0;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final api = context.read<Session>().api;
    final seq = ++_seq;
    setState(() {
      _error = null;
      _correction = null;
    });
    try {
      final items = await api.listings(_f);
      String? correction;
      if (items.isEmpty && _f.search.trim().isNotEmpty) {
        try {
          correction = (await api.fuzzy(_f.search.trim()))['correction'] as String?;
        } catch (_) {}
      }
      if (!mounted || seq != _seq) return;
      setState(() {
        _items = items;
        _correction = correction;
      });
    } catch (e) {
      if (mounted && seq == _seq) setState(() => _error = e);
    }
  }

  void _onQueryChanged(String v) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      _f.search = v;
      _load();
    });
  }

  Future<void> _openFilters() async {
    final result = await showModalBottomSheet<ListingFilter>(
      context: context,
      isScrollControlled: true,
      backgroundColor: T.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(T.rXl))),
      builder: (_) => FiltersSheet(filter: _f.copy()),
    );
    if (result != null) {
      setState(() => _f = result..search = _q.text);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final count = _f.activeCount;
    return Scaffold(
      body: Column(
        children: [
          GlassBar(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(4, 6, 14, 10),
              child: Row(children: [
                const BackButton(),
                Expanded(
                  child: TextField(
                    controller: _q,
                    autofocus: widget.initial.search.isEmpty && widget.initial.categoryId == null,
                    textInputAction: TextInputAction.search,
                    onChanged: _onQueryChanged,
                    onSubmitted: (v) {
                      _debounce?.cancel();
                      _f.search = v;
                      _load();
                    },
                    decoration: const InputDecoration(hintText: 'Поиск...', prefixIcon: Icon(Icons.search, size: 20)),
                  ),
                ),
                const SizedBox(width: 8),
                Badge(
                  isLabelVisible: count > 0,
                  label: Text('$count'),
                  backgroundColor: T.brand,
                  child: IconButton.outlined(
                    onPressed: _openFilters,
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: T.line),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.rSm)),
                    ),
                    icon: const Icon(Icons.tune_rounded, color: T.text),
                  ),
                ),
              ]),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: CustomScrollView(
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
                    sliver: SliverToBoxAdapter(child: _chips()),
                  ),
                  ..._results(),
                  const SliverToBoxAdapter(child: SizedBox(height: 24)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chips() {
    final chips = <Widget>[];
    void add(String label, VoidCallback onClear) => chips.add(InputChip(
          label: Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: T.brand)),
          backgroundColor: T.brandLight,
          side: BorderSide.none,
          shape: const StadiumBorder(),
          deleteIconColor: T.brand,
          onDeleted: () {
            setState(onClear);
            _load();
          },
        ));
    if (_f.categoryName != null) {
      add(_f.categoryName!, () {
        _f
          ..categoryId = null
          ..categoryName = null
          ..categoryHasCarFilter = false
          ..carMakeId = null
          ..carMakeName = null
          ..carModelId = null
          ..carModelName = null;
      });
    }
    if (_f.cityName != null) add(_f.cityName!, () => _f..cityId = null..cityName = null);
    if (_f.minPrice != null || _f.maxPrice != null) {
      add('${_f.minPrice != null ? 'от ${_f.minPrice} ' : ''}${_f.maxPrice != null ? 'до ${_f.maxPrice} ' : ''}₽',
          () => _f..minPrice = null..maxPrice = null);
    }
    if (_f.carMakeName != null) {
      add('${_f.carMakeName}${_f.carModelName != null ? ' ${_f.carModelName}' : ''}',
          () => _f..carMakeId = null..carMakeName = null..carModelId = null..carModelName = null);
    }
    final total = _items == null ? '' : 'Найдено: ${_items!.length}';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (chips.isNotEmpty) Wrap(spacing: 6, runSpacing: 6, children: chips),
        if (chips.isNotEmpty) const SizedBox(height: 10),
        Text(total, style: T.mutedText),
        const SizedBox(height: 10),
      ],
    );
  }

  List<Widget> _results() {
    Widget pad(Widget sliver) => SliverPadding(padding: const EdgeInsets.symmetric(horizontal: 14), sliver: sliver);
    if (_error != null) return [pad(SliverToBoxAdapter(child: ErrorBox(error: _error!, onRetry: _load)))];
    if (_items == null) {
      return [
        pad(SliverGrid(
          gridDelegate: listingGridDelegate,
          delegate: SliverChildBuilderDelegate((_, _) => const Skeleton(), childCount: 6),
        ))
      ];
    }
    if (_items!.isEmpty) {
      return [
        pad(SliverToBoxAdapter(
          child: EmptyState(
            icon: Icons.search_off_rounded,
            title: 'Ничего не найдено',
            text: 'Попробуйте изменить запрос или фильтры',
            action: _correction == null
                ? null
                : TextButton(
                    onPressed: () {
                      _q.text = _correction!;
                      _f.search = _correction!;
                      _load();
                    },
                    child: Text('Возможно, вы имели в виду: «$_correction»'),
                  ),
          ),
        ))
      ];
    }
    return [pad(ListingGrid(items: _items!))];
  }
}

/// Нижний лист с фильтрами (сайдбар фильтров на сайте).
class FiltersSheet extends StatefulWidget {
  const FiltersSheet({super.key, required this.filter});
  final ListingFilter filter;

  @override
  State<FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends State<FiltersSheet> {
  late final ListingFilter f = widget.filter;
  late final _min = TextEditingController(text: f.minPrice?.toString() ?? '');
  late final _max = TextEditingController(text: f.maxPrice?.toString() ?? '');
  late final _yFrom = TextEditingController(text: f.carYearFrom?.toString() ?? '');
  late final _yTo = TextEditingController(text: f.carYearTo?.toString() ?? '');

  int? _int(TextEditingController c) => int.tryParse(c.text.replaceAll(' ', ''));

  @override
  Widget build(BuildContext context) {
    final api = context.read<Session>().api;
    final digits = [FilteringTextInputFormatter.digitsOnly];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [
                const Expanded(child: Text('Фильтры', style: T.h2)),
                TextButton(
                  onPressed: () => Navigator.pop(context, ListingFilter()),
                  child: const Text('Сбросить'),
                ),
              ]),
              const SizedBox(height: 8),
              Labeled(
                'Категория',
                SelectField(
                  value: f.categoryName,
                  hint: 'Все категории',
                  onTap: () async {
                    final o = await pickCategory(context, api);
                    if (o == null) return;
                    setState(() {
                      f
                        ..categoryId = o.category.id
                        ..categoryName = o.category.name
                        ..categoryHasCarFilter = o.category.hasCarFilter;
                      if (!o.category.hasCarFilter) {
                        f
                          ..carMakeId = null
                          ..carMakeName = null
                          ..carModelId = null
                          ..carModelName = null;
                      }
                    });
                  },
                  onClear: () => setState(() => f
                    ..categoryId = null
                    ..categoryName = null
                    ..categoryHasCarFilter = false),
                ),
              ),
              Labeled(
                'Город',
                SelectField(
                  value: f.cityName,
                  hint: 'Все города',
                  onTap: () async {
                    final c = await pickCity(context, api);
                    if (c == null) return;
                    setState(() {
                      f.cityId = c.id == 0 ? null : c.id;
                      f.cityName = c.id == 0 ? null : c.name;
                    });
                  },
                  onClear: () => setState(() => f
                    ..cityId = null
                    ..cityName = null),
                ),
              ),
              Labeled(
                'Цена, ₽',
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: _min,
                      keyboardType: TextInputType.number,
                      inputFormatters: digits,
                      decoration: const InputDecoration(hintText: 'от'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _max,
                      keyboardType: TextInputType.number,
                      inputFormatters: digits,
                      decoration: const InputDecoration(hintText: 'до'),
                    ),
                  ),
                ]),
              ),
              if (f.categoryHasCarFilter || f.carMakeId != null) ...[
                Labeled(
                  'Марка автомобиля',
                  SelectField(
                    value: f.carMakeName,
                    hint: 'Любая марка',
                    onTap: () async {
                      final m = await pickCarMake(context, api);
                      if (m == null) return;
                      setState(() => f
                        ..carMakeId = m.id
                        ..carMakeName = m.name
                        ..carModelId = null
                        ..carModelName = null);
                    },
                    onClear: () => setState(() => f
                      ..carMakeId = null
                      ..carMakeName = null
                      ..carModelId = null
                      ..carModelName = null),
                  ),
                ),
                if (f.carMakeId != null)
                  Labeled(
                    'Модель',
                    SelectField(
                      value: f.carModelName,
                      hint: 'Любая модель',
                      onTap: () async {
                        final m = await pickCarModel(context, api, f.carMakeId!);
                        if (m == null) return;
                        setState(() => f
                          ..carModelId = m.id
                          ..carModelName = m.name);
                      },
                      onClear: () => setState(() => f
                        ..carModelId = null
                        ..carModelName = null),
                    ),
                  ),
                Labeled(
                  'Год выпуска',
                  Row(children: [
                    Expanded(
                      child: TextField(
                        controller: _yFrom,
                        keyboardType: TextInputType.number,
                        inputFormatters: digits,
                        decoration: const InputDecoration(hintText: 'с'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _yTo,
                        keyboardType: TextInputType.number,
                        inputFormatters: digits,
                        decoration: const InputDecoration(hintText: 'по'),
                      ),
                    ),
                  ]),
                ),
              ],
              const SizedBox(height: 6),
              FilledButton(
                onPressed: () {
                  f
                    ..minPrice = _int(_min)
                    ..maxPrice = _int(_max)
                    ..carYearFrom = _int(_yFrom)
                    ..carYearTo = _int(_yTo);
                  Navigator.pop(context, f);
                },
                child: const Text('Показать объявления'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
