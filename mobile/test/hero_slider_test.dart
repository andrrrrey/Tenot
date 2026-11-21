import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenot/widgets/hero_slider.dart';

double _opacityOf(WidgetTester tester, String text) {
  final fade = tester.widget<FadeTransition>(
    find.ancestor(of: find.text(text), matching: find.byType(FadeTransition)).first,
  );
  return fade.opacity.value;
}

void main() {
  // Регрессия: уходящий слайд оставался видимым поверх нового — TickerMode
  // глушил его анимацию затухания, и слайды накладывались друг на друга.
  testWidgets('после свайпа виден только новый слайд', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Padding(
            padding: EdgeInsets.all(16),
            child: HeroSlider(
              slides: [
                SizedBox(height: 200, width: double.infinity, child: Text('Первый слайд')),
                SizedBox(height: 200, width: double.infinity, child: Text('Второй слайд')),
              ],
            ),
          ),
        ),
      ),
    );

    expect(_opacityOf(tester, 'Первый слайд'), 1);
    expect(_opacityOf(tester, 'Второй слайд'), 0);

    await tester.fling(find.byType(HeroSlider), const Offset(-300, 0), 1000);
    await tester.pumpAndSettle();

    expect(_opacityOf(tester, 'Первый слайд'), 0);
    expect(_opacityOf(tester, 'Второй слайд'), 1);

    await tester.fling(find.byType(HeroSlider), const Offset(300, 0), 1000);
    await tester.pumpAndSettle();

    expect(_opacityOf(tester, 'Первый слайд'), 1);
    expect(_opacityOf(tester, 'Второй слайд'), 0);
  });
}
