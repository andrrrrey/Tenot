import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/models.dart';
import '../state/session.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'add_listing_screen.dart';
import 'chat_thread_screen.dart';

/// Карточка объявления — как app/listing/[id]/page.tsx (мобильная вёрстка).
class ListingScreen extends StatefulWidget {
  const ListingScreen({super.key, required this.id});
  final int id;

  @override
  State<ListingScreen> createState() => _ListingScreenState();
}

class _ListingScreenState extends State<ListingScreen> {
  Listing? _l;
  Object? _error;
  int _page = 0;
  bool _phoneShown = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final l = await context.read<Session>().api.listing(widget.id);
      if (mounted) setState(() => _l = l);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  /// Как handleChat на сайте: гостя — на вход, затем открыть переписку с продавцом.
  Future<void> _openChat(Listing l, ListingUser seller) async {
    if (!await requireLogin(context)) return;
    if (!mounted) return;
    if (context.read<Session>().user?.id == seller.id) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ChatThreadScreen(
        listingId: l.id,
        receiverId: seller.id,
        receiver: ChatUser(seller.id, name: seller.displayName, avatarUrl: seller.avatarUrl),
        listingTitle: l.title,
      ),
    ));
  }

  Future<void> _open(Uri uri) async {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      showInfo(context, 'Не удалось открыть ссылку');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = _l;
    return Scaffold(
      appBar: AppBar(
        title: const Logo(size: 18),
        actions: [if (l != null) Padding(padding: const EdgeInsets.only(right: 12), child: FavButton(listingId: l.id))],
      ),
      body: _error != null
          ? Padding(padding: const EdgeInsets.all(14), child: ErrorBox(error: _error!, onRetry: _load))
          : l == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(14, 8, 14, 32),
                    children: [
                      _gallery(l),
                      const SizedBox(height: 14),
                      _main(l),
                      const SizedBox(height: 14),
                      _seller(l),
                    ],
                  ),
                ),
    );
  }

  Widget _gallery(Listing l) {
    final media = l.images;
    return Container(
      decoration: T.cardDecoration(),
      clipBehavior: Clip.antiAlias,
      child: AspectRatio(
        aspectRatio: 4 / 3,
        child: media.isEmpty
            ? const NetImage(null, iconSize: 56)
            : Stack(
                fit: StackFit.expand,
                children: [
                  PageView.builder(
                    itemCount: media.length,
                    onPageChanged: (i) => setState(() => _page = i),
                    itemBuilder: (_, i) {
                      final m = media[i];
                      if (m.isImage) {
                        return GestureDetector(
                          onTap: () => _fullscreen(media.where((e) => e.isImage).toList(), m),
                          child: NetImage(m.url),
                        );
                      }
                      return InkWell(
                        onTap: () => _open(Uri.parse(context.read<Session>().api.media(m.url)!)),
                        child: Container(
                          color: const Color(0xFF111827),
                          alignment: Alignment.center,
                          child: const Column(mainAxisSize: MainAxisSize.min, children: [
                            Icon(Icons.play_circle_fill_rounded, color: Colors.white, size: 56),
                            SizedBox(height: 8),
                            Text('Видео', style: TextStyle(color: Colors.white70)),
                          ]),
                        ),
                      );
                    },
                  ),
                  if (media.length > 1)
                    Positioned(
                      bottom: 10,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          media.length,
                          (i) => AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: i == _page ? 18 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: i == _page ? Colors.white : const Color(0x99FFFFFF),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
      ),
    );
  }

  void _fullscreen(List<ListingImage> images, ListingImage start) {
    Navigator.of(context).push(MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white),
        body: PageView(
          controller: PageController(initialPage: images.indexOf(start)),
          children: [
            for (final img in images) InteractiveViewer(child: NetImage(img.url, fit: BoxFit.contain)),
          ],
        ),
      ),
    ));
  }

  Widget _main(Listing l) {
    final car = [
      if (l.carMake != null) l.carMake!.name,
      if (l.carModel != null) l.carModel!.name,
      if (l.carYear != null) '${l.carYear} г.',
    ].join(' ');
    final kv = [
      if (l.category != null) ('Категория', l.category!.name),
      if (l.cityLabel != null) ('Город', l.cityLabel!),
      if (car.isNotEmpty) ('Автомобиль', car),
      for (final a in l.attributes) (a.label, a.unit != null ? '${a.value} ${a.unit}' : a.value),
    ];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: T.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (l.isDraft || !l.isActive) ...[
            Badge2(l.isDraft ? 'Черновик' : 'Снято с публикации', color: T.muted),
            const SizedBox(height: 10),
          ],
          Text(formatPrice(l.price),
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: T.price, letterSpacing: -0.6)),
          const SizedBox(height: 6),
          Text(l.title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, height: 1.3)),
          const SizedBox(height: 8),
          Row(children: [
            if (l.cityLabel != null) ...[
              const Icon(Icons.place_outlined, size: 14, color: T.muted),
              const SizedBox(width: 3),
              Text(l.cityLabel!, style: T.mutedText),
              const Text('  ·  ', style: T.mutedText),
            ],
            Text(formatDate(l.createdAt), style: T.mutedText),
          ]),
          if (kv.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('Характеристики', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            LayoutBuilder(
              builder: (_, c) => Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final (k, v) in kv)
                    Container(
                      width: (c.maxWidth - 8) / 2,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: T.soft,
                        borderRadius: BorderRadius.circular(T.rSm),
                        border: Border.all(color: T.line),
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(k, style: const TextStyle(fontSize: 11, color: T.muted)),
                        const SizedBox(height: 3),
                        Text(v, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                      ]),
                    ),
                ],
              ),
            ),
          ],
          if (l.description.trim().isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('Описание', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 8),
            Text(l.description, style: const TextStyle(fontSize: 14, height: 1.6)),
          ],
          const Divider(height: 32),
          Text('Объявление № ${l.id}', style: T.mutedText.copyWith(fontSize: 12)),
        ],
      ),
    );
  }

  Widget _seller(Listing l) {
    final session = context.watch<Session>();
    final u = l.user;
    final isOwner = session.user != null && u != null && session.user!.id == u.id;
    final phone = u?.phone;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: T.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Продавец', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          Row(children: [
            Container(
              width: 48,
              height: 48,
              decoration: const BoxDecoration(color: T.brandLight, shape: BoxShape.circle),
              clipBehavior: Clip.antiAlias,
              alignment: Alignment.center,
              child: u?.avatarUrl != null
                  ? NetImage(u!.avatarUrl, iconSize: 18)
                  : Text(
                      (u?.displayName ?? '?').characters.first.toUpperCase(),
                      style: const TextStyle(color: T.brand, fontWeight: FontWeight.w700, fontSize: 16),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(u?.displayName ?? 'Продавец', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                const SizedBox(height: 2),
                Text(isOwner ? 'Это ваше объявление' : 'Продавец', style: T.mutedText.copyWith(fontSize: 12)),
              ]),
            ),
          ]),
          const SizedBox(height: 14),
          if (isOwner)
            FilledButton.icon(
              onPressed: () async {
                final changed = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(builder: (_) => AddListingScreen(editing: l)),
                );
                if (changed == true) _load();
              },
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Редактировать'),
            )
          else ...[
            if (phone != null && phone.isNotEmpty)
              FilledButton.icon(
                onPressed: () {
                  if (!_phoneShown) {
                    setState(() => _phoneShown = true);
                  } else {
                    _open(Uri(scheme: 'tel', path: phone.replaceAll(RegExp(r'[^\d+]'), '')));
                  }
                },
                icon: const Icon(Icons.call_outlined, size: 18),
                label: Text(_phoneShown ? 'Позвонить $phone' : 'Показать телефон'),
              ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: u == null ? null : () => _openChat(l, u),
              icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
              label: const Text('Написать в чат'),
            ),
          ],
        ],
      ),
    );
  }
}
