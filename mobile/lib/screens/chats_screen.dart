import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../state/session.dart';
import '../widgets/common.dart';

/// Чаты в объём этапа 2.1 не входят — открываем веб-версию чатов.
class ChatsScreen extends StatelessWidget {
  const ChatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final base = context.read<Session>().api.baseUrl;
    return Scaffold(
      appBar: AppBar(title: const Text('Чаты')),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          EmptyState(
            icon: Icons.chat_bubble_outline_rounded,
            title: 'Чаты скоро появятся в приложении',
            text: 'Пока переписка с продавцами доступна на сайте TENOT',
            action: OutlinedButton(
              onPressed: () => launchUrl(Uri.parse('$base/chat'), mode: LaunchMode.externalApplication),
              child: const Text('Открыть чаты на сайте'),
            ),
          ),
        ],
      ),
    );
  }
}
