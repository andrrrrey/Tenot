import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/models.dart';
import '../screens/auth_screen.dart';
import '../screens/listing_screen.dart';
import '../state/session.dart';
import '../theme.dart';

String formatPrice(num value) {
  final s = value.round().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write('\u00A0'); // неразрывный пробел, как toLocaleString('ru-RU')
    buf.write(s[i]);
  }
  return '$buf ₽';
}

const _months = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
String formatDate(DateTime d) => '${d.day} ${_months[d.month - 1]}';

void showError(BuildContext context, Object e) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(e is ApiException ? e.message : '$e')));
}

void showInfo(BuildContext context, String text) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));
}

/// Требует авторизацию: если гость — открывает экран входа. Возвращает true, если пользователь вошёл.
Future<bool> requireLogin(BuildContext context) async {
  final session = context.read<Session>();
  if (session.isLoggedIn) return true;
  await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuthScreen()));
  return session.isLoggedIn;
}

void openListing(BuildContext context, int id) {
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => ListingScreen(id: id)));
}

/// Картинка из backend (относительные `/uploads/...` дополняются базовым адресом).
class NetImage extends StatelessWidget {
  const NetImage(this.url, {super.key, this.fit = BoxFit.cover, this.iconSize = 40});
  final String? url;
  final BoxFit fit;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final full = context.read<Session>().api.media(url);
    final placeholder = Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFFF0F2F8), Color(0xFFE8EBF4)]),
      ),
      alignment: Alignment.center,
      child: Icon(Icons.image_outlined, size: iconSize, color: const Color(0x2E000000)),
    );
    if (full == null) return placeholder;
    return CachedNetworkImage(
      imageUrl: full,
      fit: fit,
      httpHeaders: const {'user-agent': 'TenotApp/1.0 (Flutter)'},
      placeholder: (_, _) => placeholder,
      errorWidget: (_, _, _) => placeholder,
    );
  }
}

/// «Стеклянная» шапка как в SiteHeader (blur 24 + полупрозрачный фон).
class GlassBar extends StatelessWidget {
  const GlassBar({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          decoration: const BoxDecoration(
            color: Color(0xD9F8F9FB),
            border: Border(bottom: BorderSide(color: Color(0x0F000000))),
          ),
          child: SafeArea(bottom: false, child: child),
        ),
      ),
    );
  }
}

/// Логотип TENOT — как в шапке сайта.
class Logo extends StatelessWidget {
  const Logo({super.key, this.size = 20});
  final double size;

  @override
  Widget build(BuildContext context) => Text(
        'TENOT',
        style: TextStyle(fontSize: size, fontWeight: FontWeight.w900, letterSpacing: -0.6, color: T.brand, height: 1),
      );
}

class Badge2 extends StatelessWidget {
  const Badge2(this.text, {super.key, this.color = T.brand});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withValues(alpha: 0.15)),
        ),
        child: Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
      );
}

/// Круглая кнопка «в избранное» поверх фото.
class FavButton extends StatelessWidget {
  const FavButton({super.key, required this.listingId, this.size = 34});
  final int listingId;
  final double size;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final fav = session.isFavorite(listingId);
    return GestureDetector(
      onTap: () async {
        if (!await requireLogin(context)) return;
        try {
          await session.toggleFavorite(listingId);
        } catch (e) {
          if (context.mounted) showError(context, e);
        }
      },
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: const Color(0xF2FFFFFF),
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xCCFFFFFF)),
          boxShadow: const [BoxShadow(color: Color(0x1F000000), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Icon(
          fav ? Icons.favorite : Icons.favorite_border,
          size: size * 0.46,
          color: fav ? T.favorite : T.muted,
        ),
      ),
    );
  }
}

/// Счётчики просмотров и добавлений в избранное — как components/ListingStats.tsx.
class ListingStats extends StatelessWidget {
  const ListingStats({super.key, required this.views, required this.favorites, this.size = 12, this.color = T.muted});
  final int views;
  final int favorites;
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(color: color, fontSize: size, fontWeight: FontWeight.w500);
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.visibility_outlined, size: size + 2, color: color),
      const SizedBox(width: 3),
      Text('$views', style: style),
      SizedBox(width: size * 0.8),
      Icon(Icons.favorite_border, size: size + 1, color: color),
      const SizedBox(width: 3),
      Text('$favorites', style: style),
    ]);
  }
}

/// Карточка объявления — копия components/ListingCard.tsx.
class ListingCard extends StatelessWidget {
  const ListingCard({super.key, required this.listing, this.footer});
  final Listing listing;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final l = listing;
    final meta = [if (l.cityLabel != null) l.cityLabel!, if (l.category != null) l.category!.name];
    return Container(
      decoration: T.cardDecoration(),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => openListing(context, l.id),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AspectRatio(
                aspectRatio: 1 / 0.62,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    NetImage(l.coverUrl),
                    Positioned(top: 8, right: 8, child: FavButton(listingId: l.id, size: 32)),
                    if (l.isDraft || !l.isActive)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xE6111827),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(l.isDraft ? 'Черновик' : 'Снято',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, height: 1.35, color: T.text)),
                      const SizedBox(height: 4),
                      if (meta.isNotEmpty)
                        Row(children: [
                          if (l.cityLabel != null) ...[
                            const Icon(Icons.place_outlined, size: 12, color: T.muted),
                            const SizedBox(width: 2),
                          ],
                          Expanded(
                            child: Text(meta.join(' · '),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: T.muted, fontSize: 11.5, fontWeight: FontWeight.w500)),
                          ),
                        ]),
                      const Spacer(),
                      Text(formatPrice(l.price),
                          style: const TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 16.5, color: T.price, letterSpacing: -0.3)),
                      const SizedBox(height: 2),
                      Row(children: [
                        Expanded(
                          child: Text(formatDate(l.createdAt),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: T.mutedLight, fontSize: 11, fontWeight: FontWeight.w500)),
                        ),
                        ListingStats(views: l.viewsCount, favorites: l.favoritesCount, size: 11, color: T.mutedLight),
                      ]),
                      ?footer,
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

const listingGridDelegate = SliverGridDelegateWithFixedCrossAxisCount(
  crossAxisCount: 2,
  mainAxisSpacing: 12,
  crossAxisSpacing: 12,
  childAspectRatio: 0.64,
);

/// Сетка объявлений в 2 колонки (как .fresh-grid на мобильном сайте).
class ListingGrid extends StatelessWidget {
  const ListingGrid({super.key, required this.items});
  final List<Listing> items;

  @override
  Widget build(BuildContext context) => SliverGrid(
        gridDelegate: listingGridDelegate,
        delegate: SliverChildBuilderDelegate(
          (context, i) => ListingCard(listing: items[i]),
          childCount: items.length,
        ),
      );
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.text, this.action});
  final IconData icon;
  final String title;
  final String? text;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
        decoration: T.cardDecoration(),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(color: T.brandLight, shape: BoxShape.circle),
              child: Icon(icon, color: T.brand),
            ),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            if (text != null) ...[
              const SizedBox(height: 6),
              Text(text!, textAlign: TextAlign.center, style: T.mutedText),
            ],
            if (action != null) ...[const SizedBox(height: 16), action!],
          ],
        ),
      );
}

class ErrorBox extends StatelessWidget {
  const ErrorBox({super.key, required this.error, required this.onRetry});
  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => EmptyState(
        icon: Icons.wifi_off_rounded,
        title: 'Не удалось загрузить',
        text: error is ApiException ? (error as ApiException).message : '$error',
        action: OutlinedButton(onPressed: onRetry, child: const Text('Повторить')),
      );
}

/// Скелетон-плашка (аналог .skeleton).
class Skeleton extends StatelessWidget {
  const Skeleton({super.key, this.height, this.radius = T.rLg});
  final double? height;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
        height: height,
        decoration: BoxDecoration(color: const Color(0x0F000000), borderRadius: BorderRadius.circular(radius)),
      );
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.trailing});
  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(children: [Expanded(child: Text(text, style: T.h2)), ?trailing]),
      );
}

/// Поле с подписью как .field-label на сайте.
class Labeled extends StatelessWidget {
  const Labeled(this.label, this.child, {super.key});
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: T.text)),
            const SizedBox(height: 6),
            child,
          ],
        ),
      );
}

/// Поле-«селект»: выглядит как input, по тапу открывает выбор.
class SelectField extends StatelessWidget {
  const SelectField({super.key, required this.value, required this.hint, required this.onTap, this.onClear});
  final String? value;
  final String hint;
  final VoidCallback onTap;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(T.rSm),
        child: InputDecorator(
          decoration: InputDecoration(
            suffixIcon: value != null && onClear != null
                ? IconButton(icon: const Icon(Icons.close, size: 18), onPressed: onClear)
                : const Icon(Icons.expand_more, color: T.muted),
          ),
          child: Text(value ?? hint,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 14, color: value == null ? T.mutedLight : T.text)),
        ),
      );
}

/// Нижний лист со списком вариантов и поиском.
Future<E?> pickFromList<E>(
  BuildContext context, {
  required String title,
  required Future<List<E>> Function(String query) load,
  required String Function(E) label,
  String? Function(E)? subtitle,
  bool searchable = true,
  bool remoteSearch = false,
}) {
  return showModalBottomSheet<E>(
    context: context,
    isScrollControlled: true,
    backgroundColor: T.bg,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(T.rXl))),
    builder: (_) => _PickerSheet<E>(
      title: title,
      load: load,
      label: label,
      subtitle: subtitle,
      searchable: searchable,
      remoteSearch: remoteSearch,
    ),
  );
}

class _PickerSheet<E> extends StatefulWidget {
  const _PickerSheet({
    required this.title,
    required this.load,
    required this.label,
    this.subtitle,
    required this.searchable,
    required this.remoteSearch,
  });
  final String title;
  final Future<List<E>> Function(String) load;
  final String Function(E) label;
  final String? Function(E)? subtitle;
  final bool searchable;
  final bool remoteSearch;

  @override
  State<_PickerSheet<E>> createState() => _PickerSheetState<E>();
}

class _PickerSheetState<E> extends State<_PickerSheet<E>> {
  List<E> _items = [];
  bool _loading = true;
  Object? _error;
  String _q = '';
  int _seq = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final seq = ++_seq;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await widget.load(_q);
      if (mounted && seq == _seq) setState(() => _items = items);
    } catch (e) {
      if (mounted && seq == _seq) setState(() => _error = e);
    } finally {
      if (mounted && seq == _seq) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = widget.remoteSearch || _q.isEmpty
        ? _items
        : _items.where((e) => widget.label(e).toLowerCase().contains(_q.toLowerCase())).toList();
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.75,
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: T.line, borderRadius: BorderRadius.circular(2))),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
              child: Row(children: [
                Expanded(child: Text(widget.title, style: T.h2)),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ]),
            ),
            if (widget.searchable)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: TextField(
                  autofocus: widget.remoteSearch,
                  decoration: const InputDecoration(hintText: 'Поиск...', prefixIcon: Icon(Icons.search, size: 20)),
                  onChanged: (v) {
                    setState(() => _q = v);
                    if (widget.remoteSearch) {
                      Future.delayed(const Duration(milliseconds: 400), () {
                        if (mounted && _q == v) _load();
                      });
                    }
                  },
                ),
              ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Padding(padding: const EdgeInsets.all(16), child: ErrorBox(error: _error!, onRetry: _load))
                      : visible.isEmpty
                          ? const Center(child: Text('Ничего не найдено', style: T.mutedText))
                          : ListView.separated(
                              itemCount: visible.length,
                              separatorBuilder: (_, _) => const Divider(height: 1, indent: 16, endIndent: 16),
                              itemBuilder: (_, i) {
                                final item = visible[i];
                                final sub = widget.subtitle?.call(item);
                                return ListTile(
                                  title: Text(widget.label(item), style: const TextStyle(fontSize: 14.5)),
                                  subtitle: sub == null ? null : Text(sub, style: T.mutedText),
                                  onTap: () => Navigator.pop(context, item),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }
}
