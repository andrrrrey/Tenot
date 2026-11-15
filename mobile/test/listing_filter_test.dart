import 'package:flutter_test/flutter_test.dart';
import 'package:tenot/api/models.dart';

void main() {
  test('по умолчанию сортировка и фильтр 360° не уходят в запрос (сервер ранжирует сам)', () {
    final f = ListingFilter(search: 'bmw');
    expect(f.toQuery(), {'search': 'bmw'});
    expect(f.activeCount, 0);
  });

  test('сортировка и фильтр 360° передаются и сохраняются при копировании', () {
    final f = ListingFilter(only360: true, sort: ListingSort.cheap).copy();
    expect(f.toQuery(), {'has360': 'true', 'sort': 'cheap'});
    expect(f.activeCount, 1);
    expect(ListingFilter(sort: ListingSort.newest).toQuery(), {'sort': 'new'});
  });
}
