import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../api/models.dart';
import '../state/session.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/pickers.dart';
import 'add_listing_screen.dart';
import 'auth_screen.dart';

/// Личный кабинет — как app/me: профиль, аватар, мои объявления.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => ProfileScreenState();
}

enum _Tab { active, drafts, archived }

class ProfileScreenState extends State<ProfileScreen> {
  List<Listing>? _mine;
  Object? _error;
  _Tab _tab = _Tab.active;
  bool _avatarBusy = false;

  Future<void> reload() async {
    final session = context.read<Session>();
    if (!session.isLoggedIn) return;
    setState(() => _error = null);
    try {
      final mine = await session.api.myListings();
      if (mounted) setState(() => _mine = mine);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => reload());
  }

  Future<void> _changeAvatar() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 800, imageQuality: 85);
    if (file == null || !mounted) return;
    final session = context.read<Session>();
    setState(() => _avatarBusy = true);
    try {
      session.setUser(await session.api.uploadAvatar(file.path));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _avatarBusy = false);
    }
  }

  Future<void> _editProfile() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: T.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(T.rXl))),
      builder: (_) => const _EditProfileSheet(),
    );
    if (saved == true && mounted) showInfo(context, 'Профиль сохранён');
  }

  Future<void> _toggle(Listing l) async {
    try {
      await context.read<Session>().api.toggleListing(l.id, !l.isActive);
      reload();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _delete(Listing l) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Удалить объявление?'),
        content: Text('«${l.title}» будет удалено без возможности восстановления.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Отмена')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: T.favorite),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<Session>().api.deleteListing(l.id);
      reload();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _edit(Listing l) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => AddListingScreen(editing: l)),
    );
    if (changed == true) reload();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final user = session.user;
    return Scaffold(
      appBar: AppBar(
        title: Text(user == null ? 'Вход' : 'Личный кабинет'),
        actions: [
          if (user != null)
            IconButton(
              tooltip: 'Выйти',
              icon: const Icon(Icons.logout_rounded),
              onPressed: () async {
                await session.logout();
                setState(() => _mine = null);
              },
            ),
        ],
      ),
      body: user == null
          ? ListView(padding: const EdgeInsets.all(14), children: [AuthForm(onDone: reload)])
          : RefreshIndicator(
              onRefresh: () async {
                await session.refreshUser();
                await reload();
              },
              child: ListView(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 32),
                children: [
                  _profileCard(user),
                  const SizedBox(height: 22),
                  const SectionTitle('Мои объявления'),
                  _tabs(),
                  const SizedBox(height: 12),
                  ..._myListings(),
                ],
              ),
            ),
    );
  }

  Widget _profileCard(UserProfile user) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: T.cardDecoration(),
      child: Column(children: [
        Row(children: [
          GestureDetector(
            onTap: _avatarBusy ? null : _changeAvatar,
            child: Stack(children: [
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  color: T.brandLight,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: T.shadowSm,
                ),
                clipBehavior: Clip.antiAlias,
                alignment: Alignment.center,
                child: _avatarBusy
                    ? const CircularProgressIndicator(strokeWidth: 2)
                    : user.avatarUrl != null
                        ? NetImage(user.avatarUrl, iconSize: 20)
                        : Text(user.displayName.characters.first.toUpperCase(),
                            style: const TextStyle(color: T.brand, fontSize: 24, fontWeight: FontWeight.w700)),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: T.brand,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Icon(Icons.photo_camera, size: 12, color: Colors.white),
                ),
              ),
            ]),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(user.displayName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
              const SizedBox(height: 3),
              Text(user.email, style: T.mutedText),
              if (user.phone != null && user.phone!.isNotEmpty) Text(user.phone!, style: T.mutedText),
              if (user.city != null)
                Row(children: [
                  const Icon(Icons.place_outlined, size: 13, color: T.muted),
                  const SizedBox(width: 2),
                  Text(user.city!.name, style: T.mutedText),
                ]),
            ]),
          ),
        ]),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _editProfile,
            icon: const Icon(Icons.edit_outlined, size: 18),
            label: const Text('Редактировать профиль'),
          ),
        ),
      ]),
    );
  }

  Widget _tabs() {
    final all = _mine ?? [];
    int count(_Tab t) => all.where((l) => _inTab(l, t)).length;
    Widget seg(_Tab t, String label) {
      final active = _tab == t;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() => _tab = t),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(vertical: 9),
            decoration: BoxDecoration(
              color: active ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(T.rXs),
              boxShadow: active ? T.shadowSm : null,
            ),
            alignment: Alignment.center,
            child: Text('$label ${_mine == null ? '' : count(t)}',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: active ? T.text : T.muted,
                )),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: const Color(0x0D000000), borderRadius: BorderRadius.circular(T.rSm)),
      child: Row(children: [
        seg(_Tab.active, 'Активные'),
        seg(_Tab.drafts, 'Черновики'),
        seg(_Tab.archived, 'Снятые'),
      ]),
    );
  }

  bool _inTab(Listing l, _Tab t) => switch (t) {
        _Tab.active => !l.isDraft && l.isActive,
        _Tab.drafts => l.isDraft,
        _Tab.archived => !l.isDraft && !l.isActive,
      };

  List<Widget> _myListings() {
    if (_error != null) return [ErrorBox(error: _error!, onRetry: reload)];
    if (_mine == null) {
      return [const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))];
    }
    final items = _mine!.where((l) => _inTab(l, _tab)).toList();
    if (items.isEmpty) {
      return [
        const EmptyState(
          icon: Icons.inventory_2_outlined,
          title: 'Здесь пока пусто',
          text: 'Нажмите «+» внизу, чтобы разместить объявление',
        ),
      ];
    }
    return [
      for (final l in items)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _MyListingTile(
            listing: l,
            onEdit: () => _edit(l),
            onToggle: l.isDraft ? null : () => _toggle(l),
            onDelete: () => _delete(l),
          ),
        ),
    ];
  }
}

class _MyListingTile extends StatelessWidget {
  const _MyListingTile({required this.listing, required this.onEdit, this.onToggle, required this.onDelete});
  final Listing listing;
  final VoidCallback onEdit;
  final VoidCallback? onToggle;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final l = listing;
    return Container(
      decoration: T.cardDecoration(radius: T.r, shadow: T.shadowSm),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => openListing(context, l.id),
          child: Row(children: [
            SizedBox(width: 96, height: 96, child: NetImage(l.coverUrl, iconSize: 24)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(l.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, height: 1.3)),
                const SizedBox(height: 4),
                Text(formatPrice(l.price),
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: T.price)),
                const SizedBox(height: 2),
                Text(formatDate(l.createdAt), style: T.mutedText.copyWith(fontSize: 11.5)),
              ]),
            ),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, color: T.muted),
              onSelected: (v) => switch (v) {
                'edit' => onEdit(),
                'toggle' => onToggle?.call(),
                _ => onDelete(),
              },
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'edit', child: Text('Редактировать')),
                if (onToggle != null)
                  PopupMenuItem(value: 'toggle', child: Text(l.isActive ? 'Снять с публикации' : 'Опубликовать снова')),
                const PopupMenuItem(value: 'delete', child: Text('Удалить', style: TextStyle(color: T.favorite))),
              ],
            ),
          ]),
        ),
      ),
    );
  }
}

class _EditProfileSheet extends StatefulWidget {
  const _EditProfileSheet();

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  late final Session session = context.read<Session>();
  late final _name = TextEditingController(text: session.user?.name ?? '');
  late final _phone = TextEditingController(text: session.user?.phone ?? '');
  late int? _cityId = session.user?.city?.id;
  late String? _cityName = session.user?.city?.name;
  bool _busy = false;

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      session.setUser(await session.api.updateMe(name: _name.text.trim(), phone: _phone.text.trim(), cityId: _cityId));
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Профиль', style: T.h2),
              const SizedBox(height: 14),
              Labeled('Имя', TextField(controller: _name, decoration: const InputDecoration(hintText: 'Как к вам обращаться'))),
              Labeled(
                'Телефон',
                TextField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(hintText: '+7 900 000-00-00'),
                ),
              ),
              Labeled(
                'Город',
                SelectField(
                  value: _cityName,
                  hint: 'Выберите город',
                  onTap: () async {
                    final c = await pickCity(context, session.api, allowAll: false);
                    if (c != null) {
                      setState(() {
                        _cityId = c.id;
                        _cityName = c.name;
                      });
                    }
                  },
                ),
              ),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: _busy
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Сохранить'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
