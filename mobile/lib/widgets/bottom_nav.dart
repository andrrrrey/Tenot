import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/chat_store.dart';
import '../state/session.dart';
import '../theme.dart';
import 'common.dart';

/// Нижняя навигация — копия components/MobileBottomNav.tsx.
class BottomNav extends StatelessWidget {
  const BottomNav({super.key, required this.index, required this.onTap});
  final int index;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<Session>().user;
    final unread = context.select<ChatStore, int>((s) => s.unreadTotal);
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xF7F8F9FB),
        border: Border(top: BorderSide(color: Color(0x12000000))),
        boxShadow: [BoxShadow(color: Color(0x0A000000), blurRadius: 32, offset: Offset(0, -8))],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 74,
          child: Row(
            children: [
              _tab(0, Icons.home_outlined, Icons.home_rounded, 'Главная'),
              _tab(1, Icons.favorite_border, Icons.favorite, 'Избранное'),
              Expanded(
                child: InkWell(
                  onTap: () => onTap(2),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          color: T.brand,
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0x4DFFFFFF), width: 2),
                          boxShadow: const [BoxShadow(color: T.brandGlow, blurRadius: 20, offset: Offset(0, 6))],
                        ),
                        child: const Icon(Icons.add_rounded, color: Colors.white, size: 26),
                      ),
                      const SizedBox(height: 4),
                      const Text('Добавить',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: T.brand, height: 1)),
                    ],
                  ),
                ),
              ),
              _tab(3, Icons.chat_bubble_outline_rounded, Icons.chat_bubble_rounded, 'Чаты', badge: unread),
              _profileTab(user?.avatarUrl, user != null),
            ],
          ),
        ),
      ),
    );
  }

  Widget _circle({required bool active, required Widget child}) => AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: active ? T.brand : const Color(0xD9FFFFFF),
          shape: BoxShape.circle,
          border: Border.all(color: active ? const Color(0x40FFFFFF) : const Color(0xD9FFFFFF), width: 1.5),
          boxShadow: active ? T.brandShadow : T.shadowSm,
        ),
        alignment: Alignment.center,
        child: child,
      );

  Widget _label(String text, bool active) => Text(text,
      style: TextStyle(
        fontSize: 10,
        height: 1,
        fontWeight: active ? FontWeight.w600 : FontWeight.w500,
        color: active ? T.brand : T.muted,
      ));

  Widget _tab(int i, IconData icon, IconData activeIcon, String label, {int badge = 0}) {
    final active = index == i;
    return Expanded(
      child: InkWell(
        onTap: () => onTap(i),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(clipBehavior: Clip.none, children: [
              _circle(active: active, child: Icon(active ? activeIcon : icon, size: 21, color: active ? Colors.white : T.muted)),
              if (badge > 0)
                Positioned(
                  top: -2,
                  right: -4,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 16),
                    height: 16,
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: T.favorite,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xE6F8F9FB), width: 1.5),
                    ),
                    child: Text(badge > 9 ? '9+' : '$badge',
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700, height: 1)),
                  ),
                ),
            ]),
            const SizedBox(height: 4),
            _label(label, active),
          ],
        ),
      ),
    );
  }

  Widget _profileTab(String? avatar, bool loggedIn) {
    final active = index == 4;
    return Expanded(
      child: InkWell(
        onTap: () => onTap(4),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (avatar != null)
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: active ? T.brand : const Color(0xD9FFFFFF), width: active ? 2.5 : 2),
                  boxShadow: active ? T.brandShadow : T.shadowSm,
                ),
                child: ClipOval(child: NetImage(avatar, iconSize: 18)),
              )
            else
              _circle(
                active: active,
                child: Icon(active ? Icons.person_rounded : Icons.person_outline_rounded,
                    size: 21, color: active ? Colors.white : T.muted),
              ),
            const SizedBox(height: 4),
            _label(loggedIn ? 'Профиль' : 'Войти', active),
          ],
        ),
      ),
    );
  }
}
