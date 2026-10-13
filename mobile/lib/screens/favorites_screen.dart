import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/models.dart';
import '../state/session.dart';
import '../widgets/common.dart';
import 'auth_screen.dart';

/// Избранное — как app/me/fav.
class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => FavoritesScreenState();
}

class FavoritesScreenState extends State<FavoritesScreen> {
  List<Listing>? _items;
  Object? _error;

  Future<void> reload() async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) return;
    setState(() => _error = null);
    try {
      final items = await session.api.favorites();
      if (mounted) setState(() => _items = items);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    // Убираем из списка то, что сняли с избранного прямо на карточке.
    final items = _items?.where((l) => session.isFavorite(l.id)).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Избранное')),
      body: !session.isLoggedIn
          ? ListView(padding: const EdgeInsets.all(14), children: [AuthForm(onDone: reload)])
          : RefreshIndicator(
              onRefresh: reload,
              child: CustomScrollView(slivers: [
                SliverPadding(
                  padding: const EdgeInsets.all(14),
                  sliver: _error != null
                      ? SliverToBoxAdapter(child: ErrorBox(error: _error!, onRetry: reload))
                      : items == null
                          ? SliverToBoxAdapter(child: _Loader(onInit: reload))
                          : items.isEmpty
                              ? const SliverToBoxAdapter(
                                  child: EmptyState(
                                    icon: Icons.favorite_border,
                                    title: 'В избранном пока пусто',
                                    text: 'Нажмите на сердечко в объявлении, чтобы сохранить его здесь',
                                  ),
                                )
                              : ListingGrid(items: items),
                ),
              ]),
            ),
    );
  }
}

class _Loader extends StatefulWidget {
  const _Loader({required this.onInit});
  final VoidCallback onInit;

  @override
  State<_Loader> createState() => _LoaderState();
}

class _LoaderState extends State<_Loader> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => widget.onInit());
  }

  @override
  Widget build(BuildContext context) =>
      const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()));
}
