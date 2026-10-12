import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/models.dart';
import '../state/session.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/pickers.dart';
import 'search_screen.dart';

/// Главная — как app/page.tsx в мобильной вёрстке: шапка с поиском, hero, категории, свежие.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Category>? _categories;
  List<Listing>? _fresh;
  Object? _error;
  final _q = TextEditingController();
  int? _cityId;
  String? _cityName;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = context.read<Session>().api;
    setState(() => _error = null);
    try {
      final cats = await api.categories();
      final fresh = await api.listings(ListingFilter(cityId: _cityId));
      if (!mounted) return;
      setState(() {
        _categories = cats;
        _fresh = fresh.take(8).toList();
      });
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  void _search({Category? category}) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => SearchScreen(
        initial: ListingFilter(
          search: category == null ? _q.text : '',
          categoryId: category?.id,
          categoryName: category?.name,
          categoryHasCarFilter: category?.hasCarFilter ?? false,
          cityId: _cityId,
          cityName: _cityName,
        ),
      ),
    ));
  }

  Future<void> _pickCity() async {
    final api = context.read<Session>().api;
    final city = await pickCity(context, api);
    if (city == null) return;
    setState(() {
      _cityId = city.id == 0 ? null : city.id;
      _cityName = city.id == 0 ? null : city.name;
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GlassBar(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
            child: Column(
              children: [
                const SizedBox(height: 52, child: Align(alignment: Alignment.centerLeft, child: Logo())),
                Row(children: [
                  SizedBox(
                    width: 130,
                    child: OutlinedButton.icon(
                      onPressed: _pickCity,
                      icon: const Icon(Icons.place_outlined, size: 16),
                      label: Text(_cityName ?? 'Все города', maxLines: 1, overflow: TextOverflow.ellipsis),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        alignment: Alignment.centerLeft,
                        textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _q,
                      textInputAction: TextInputAction.search,
                      onSubmitted: (_) => _search(),
                      decoration: InputDecoration(
                        hintText: 'Поиск...',
                        suffixIcon: Padding(
                          padding: const EdgeInsets.all(6),
                          child: Material(
                            color: T.brand,
                            borderRadius: BorderRadius.circular(T.rXs),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(T.rXs),
                              onTap: _search,
                              child: const SizedBox(width: 32, child: Icon(Icons.search, color: Colors.white, size: 17)),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ]),
              ],
            ),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(14, 16, 14, 0),
                  sliver: SliverToBoxAdapter(child: _hero()),
                ),
                const SliverPadding(
                  padding: EdgeInsets.fromLTRB(14, 28, 14, 0),
                  sliver: SliverToBoxAdapter(child: SectionTitle('Категории')),
                ),
                SliverToBoxAdapter(child: _categoriesRow()),
                const SliverPadding(
                  padding: EdgeInsets.fromLTRB(14, 28, 14, 0),
                  sliver: SliverToBoxAdapter(child: SectionTitle('Свежие объявления')),
                ),
                if (_error != null)
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    sliver: SliverToBoxAdapter(child: ErrorBox(error: _error!, onRetry: _load)),
                  )
                else if (_fresh == null)
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    sliver: SliverGrid(
                      gridDelegate: listingGridDelegate,
                      delegate: SliverChildBuilderDelegate((_, _) => const Skeleton(), childCount: 4),
                    ),
                  )
                else if (_fresh!.isEmpty)
                  const SliverPadding(
                    padding: EdgeInsets.symmetric(horizontal: 14),
                    sliver: SliverToBoxAdapter(
                      child: EmptyState(icon: Icons.inbox_outlined, title: 'Пока нет объявлений'),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    sliver: ListingGrid(items: _fresh!),
                  ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(14, 20, 14, 28),
                  sliver: SliverToBoxAdapter(
                    child: Center(
                      child: OutlinedButton(
                        onPressed: _search,
                        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 28)),
                        child: const Text('Посмотреть все объявления'),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _hero() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
      decoration: T.cardDecoration(radius: T.rXl),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: -80,
            right: -80,
            child: Container(
              width: 220,
              height: 220,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(colors: [Color(0x142563EB), Color(0x002563EB)]),
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Badge2('объявления без лишнего'),
              const SizedBox(height: 14),
              const Text.rich(
                TextSpan(children: [
                  TextSpan(text: 'Найди или продай\n'),
                  TextSpan(text: 'быстро', style: TextStyle(color: T.brand)),
                  TextSpan(text: ' и просто'),
                ]),
                style: T.h1,
              ),
              const SizedBox(height: 12),
              Text(
                'Размести объявление за минуту или найди нужное — без перегруза и лишних шагов.',
                style: T.mutedText.copyWith(fontSize: 14, height: 1.6),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _categoriesRow() {
    final cats = _categories;
    return SizedBox(
      height: 92,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        scrollDirection: Axis.horizontal,
        itemCount: cats?.length ?? 4,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, i) {
          if (cats == null) return const SizedBox(width: 150, child: Skeleton());
          final c = cats[i];
          return _CategoryCard(category: c, onTap: () => _search(category: c));
        },
      ),
    );
  }
}

/// Карточка категории — как .cat-card в CategoriesGrid.tsx.
class _CategoryCard extends StatelessWidget {
  const _CategoryCard({required this.category, required this.onTap});
  final Category category;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      decoration: T.cardDecoration(shadow: T.shadowXs),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: Stack(
            children: [
              Positioned(
                right: -6,
                bottom: -6,
                width: 72,
                height: 72,
                child: category.imageUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: NetImage(category.imageUrl, iconSize: 24),
                      )
                    : Container(
                        decoration: BoxDecoration(color: T.brandLight, borderRadius: BorderRadius.circular(12)),
                        child: const Icon(Icons.grid_view_rounded, color: T.brand, size: 28),
                      ),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: SizedBox(
                  width: 118,
                  child: Text(category.name,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.3, color: T.text)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
