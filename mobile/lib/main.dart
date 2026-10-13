import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'api/api.dart';
import 'screens/add_listing_screen.dart';
import 'screens/chats_screen.dart';
import 'screens/favorites_screen.dart';
import 'screens/home_screen.dart';
import 'screens/profile_screen.dart';
import 'state/chat_store.dart';
import 'state/session.dart';
import 'theme.dart';
import 'widgets/bottom_nav.dart';
import 'widgets/common.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
  ));
  final session = Session(Api())..init();
  runApp(TenotApp(session: session));
}

class TenotApp extends StatelessWidget {
  const TenotApp({super.key, required this.session});
  final Session session;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: session),
        ChangeNotifierProvider(create: (_) => ChatStore(session)),
      ],
      child: MaterialApp(
        title: 'TENOT',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        home: const _Root(),
      ),
    );
  }
}

class _Root extends StatelessWidget {
  const _Root();

  @override
  Widget build(BuildContext context) {
    final ready = context.select<Session, bool>((s) => s.ready);
    if (!ready) {
      return const Scaffold(body: Center(child: Logo(size: 34)));
    }
    return const Shell();
  }
}

/// Переключение вкладок из любого экрана.
final tabIndex = ValueNotifier<int>(0);

class Shell extends StatefulWidget {
  const Shell({super.key});

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  final _favKey = GlobalKey<FavoritesScreenState>();
  final _profileKey = GlobalKey<ProfileScreenState>();

  Future<void> _onTap(int i) async {
    if (i == 2) {
      if (!await requireLogin(context)) return;
      if (!mounted) return;
      final created = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => const AddListingScreen()),
      );
      if (created == true) {
        tabIndex.value = 4;
        _profileKey.currentState?.reload();
      }
      return;
    }
    if (i == 1) _favKey.currentState?.reload();
    if (i == 3) context.read<ChatStore>().refresh();
    if (i == 4) _profileKey.currentState?.reload();
    tabIndex.value = i;
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: tabIndex,
      builder: (context, index, _) => PopScope(
        canPop: index == 0,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) tabIndex.value = 0;
        },
        child: Scaffold(
          body: IndexedStack(
            index: index,
            children: [
              const HomeScreen(),
              FavoritesScreen(key: _favKey),
              const SizedBox.shrink(),
              const ChatsScreen(),
              ProfileScreen(key: _profileKey),
            ],
          ),
          bottomNavigationBar: BottomNav(index: index, onTap: _onTap),
        ),
      ),
    );
  }
}
