import 'package:flutter_test/flutter_test.dart';
import 'package:tenot/widgets/chat_widgets.dart';

void main() {
  test('formatChatDay: сегодня, вчера, дата, дата с годом', () {
    final now = DateTime(2026, 11, 23, 12);
    expect(formatChatDay(DateTime(2026, 11, 23, 0, 5), now: now), 'Сегодня');
    expect(formatChatDay(DateTime(2026, 11, 22, 23, 59), now: now), 'Вчера');
    expect(formatChatDay(DateTime(2026, 11, 18, 15, 21), now: now), '18 ноября');
    expect(formatChatDay(DateTime(2025, 12, 31), now: now), '31 декабря 2025');
    // Вчера через границу месяца/года.
    expect(formatChatDay(DateTime(2025, 12, 31, 20), now: DateTime(2026, 1, 1, 9)), 'Вчера');
  });
}
