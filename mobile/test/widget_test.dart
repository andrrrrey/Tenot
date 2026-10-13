import 'package:flutter_test/flutter_test.dart';
import 'package:tenot/api/models.dart';
import 'package:tenot/widgets/common.dart';

void main() {
  test('formatPrice как на сайте', () {
    expect(formatPrice(1500000), '1\u00A0500\u00A0000\u00A0₽');
    expect(formatPrice(990), '990\u00A0₽');
  });

  test('Listing.fromJson и обложка', () {
    final l = Listing.fromJson({
      'id': 7,
      'title': 'iPhone',
      'description': 'Отличное состояние',
      'price': 50000,
      'status': 'PUBLISHED',
      'isActive': true,
      'createdAt': '2026-10-01T10:00:00.000Z',
      'category': {'id': 1, 'name': 'Телефоны', 'hasCarFilter': false},
      'city': {'id': 2, 'name': 'Москва'},
      'images': [
        {'id': 1, 'url': '/uploads/listings/a.jpg', 'type': 'image', 'isCover': false, 'order': 0},
        {'id': 2, 'url': '/uploads/listings/b.jpg', 'type': 'image', 'isCover': true, 'order': 1},
      ],
      'attributes': [
        {'id': 1, 'categoryFieldId': 5, 'numberValue': 128, 'field': {'id': 5, 'label': 'Память', 'type': 'NUMBER', 'unit': 'ГБ'}},
      ],
    });
    expect(l.coverUrl, '/uploads/listings/b.jpg');
    expect(l.cityLabel, 'Москва');
    expect(l.attributes.single.fieldId, 5);
    expect(l.attributes.single.value, '128');
  });

  test('ListingFilter.toQuery', () {
    final f = ListingFilter(search: ' шины ', categoryId: 3, minPrice: 100);
    expect(f.toQuery(), {'search': 'шины', 'categoryId': '3', 'minPrice': '100'});
    expect(f.activeCount, 2);
  });
}
