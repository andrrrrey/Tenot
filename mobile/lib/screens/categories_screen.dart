import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/models.dart';
import '../state/session.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Все категории плитками — как страница /categories на сайте.
class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key, this.initial, required this.onSelect});
  final List<Category>? initial;
  final ValueChanged<Category> onSelect;

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  late List<Category>? _items = widget.initial;
  Object? _error;

  @override
  void initState() {
    super.initState();
    if (_items == null) _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await context.read<Session>().api.categories();
      if (mounted) setState(() => _items = items);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    return Scaffold(
      appBar: AppBar(title: const Text('Все категории')),
      body: _error != null
          ? Padding(padding: const EdgeInsets.all(14), child: ErrorBox(error: _error!, onRetry: _load))
          : RefreshIndicator(
              onRefresh: _load,
              child: GridView.builder(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 24),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  mainAxisExtent: 92,
                ),
                itemCount: items?.length ?? 8,
                itemBuilder: (_, i) {
                  if (items == null) return const Skeleton();
                  final c = items[i];
                  return CategoryCard(
                    category: c,
                    width: null,
                    onTap: () => widget.onSelect(c),
                  );
                },
              ),
            ),
    );
  }
}

/// Карточка категории — как .cat-card в CategoriesGrid.tsx.
class CategoryCard extends StatelessWidget {
  const CategoryCard({super.key, required this.category, required this.onTap, this.width = 150});
  final Category category;
  final VoidCallback onTap;
  final double? width;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
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
