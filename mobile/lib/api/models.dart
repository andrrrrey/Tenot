// Модели данных — по frontend/services/*.ts.

int _int(dynamic v) => v is int ? v : (v is num ? v.toInt() : int.tryParse('$v') ?? 0);
int? _intN(dynamic v) => v == null ? null : _int(v);
double _num(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;

class IdName {
  final int id;
  final String name;
  const IdName(this.id, this.name);

  static IdName? fromJson(dynamic j) =>
      j is Map<String, dynamic> ? IdName(_int(j['id']), '${j['name'] ?? ''}') : null;
}

class ListingImage {
  final int id;
  final String url;
  final String type;
  final bool isCover;

  ListingImage.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']),
        url = '${j['url'] ?? ''}',
        type = '${j['type'] ?? 'image'}',
        isCover = j['isCover'] == true;

  bool get isImage => type == 'image';
}

class ListingUser {
  final int id;
  final String? name;
  final String? phone;
  final String? avatarUrl;
  final String? email;

  ListingUser.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']),
        name = j['name'] as String?,
        phone = j['phone'] as String?,
        avatarUrl = j['avatarUrl'] as String?,
        email = j['email'] as String?;

  String get displayName =>
      (name != null && name!.trim().isNotEmpty) ? name! : (email?.split('@').first ?? 'Продавец');
}

class ListingAttribute {
  final int fieldId;
  final String label;
  final String? unit;
  final String value;

  /// Значение в исходном виде — для предзаполнения формы редактирования.
  final Object? raw;

  ListingAttribute(this.fieldId, this.label, this.unit, this.value, this.raw);

  static ListingAttribute? fromJson(Map<String, dynamic> j) {
    final field = j['field'] as Map<String, dynamic>? ?? const {};
    String? value;
    Object? raw;
    if (j['textValue'] != null) raw = value = '${j['textValue']}';
    if (j['numberValue'] != null) {
      raw = j['numberValue'];
      value = '${j['numberValue']}';
    }
    if (j['booleanValue'] != null) {
      raw = j['booleanValue'] == true;
      value = raw == true ? 'Да' : 'Нет';
    }
    if (j['jsonValue'] is List) {
      raw = (j['jsonValue'] as List).map((e) => '$e').toList();
      value = (raw as List).join(', ');
    }
    if (value == null || value.isEmpty) return null;
    return ListingAttribute(
      _int(j['categoryFieldId'] ?? field['id']),
      '${field['label'] ?? ''}',
      field['unit'] as String?,
      value,
      raw,
    );
  }
}

class Listing {
  final int id;
  final String title;
  final String description;
  final double price;
  final bool isActive;
  final String status;
  final DateTime createdAt;
  final IdName? category;
  final bool categoryHasCarFilter;
  final List<ListingImage> images;
  final ListingUser? user;
  final IdName? city;
  final bool allCities;
  final int? carMakeId;
  final int? carModelId;
  final int? carYear;
  final IdName? carMake;
  final IdName? carModel;
  final List<ListingAttribute> attributes;

  Listing.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']),
        title = '${j['title'] ?? ''}',
        description = '${j['description'] ?? ''}',
        price = _num(j['price']),
        isActive = j['isActive'] != false,
        status = '${j['status'] ?? 'PUBLISHED'}',
        createdAt = DateTime.tryParse('${j['createdAt']}') ?? DateTime.now(),
        category = IdName.fromJson(j['category']),
        categoryHasCarFilter = (j['category'] is Map) && j['category']['hasCarFilter'] == true,
        images = (j['images'] as List? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(ListingImage.fromJson)
            .toList(),
        user = j['user'] is Map<String, dynamic> ? ListingUser.fromJson(j['user']) : null,
        city = IdName.fromJson(j['city']),
        allCities = j['allCities'] == true,
        carMakeId = _intN(j['carMakeId']),
        carModelId = _intN(j['carModelId']),
        carYear = _intN(j['carYear']),
        carMake = IdName.fromJson(j['carMake']),
        carModel = IdName.fromJson(j['carModel']),
        attributes = (j['attributes'] as List? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(ListingAttribute.fromJson)
            .whereType<ListingAttribute>()
            .toList();

  bool get isDraft => status == 'DRAFT';

  /// Как getCoverUrl во frontend/services/listings.ts.
  String? get coverUrl {
    final imgs = images.where((i) => i.isImage).toList();
    if (imgs.isEmpty) return null;
    return imgs.firstWhere((i) => i.isCover, orElse: () => imgs.first).url;
  }

  String? get cityLabel => allCities ? 'Все города' : city?.name;
}

class Category {
  final int id;
  final String name;
  final String? imageUrl;
  final int? parentId;
  final bool hasCarFilter;
  final List<Category> children;

  Category.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']),
        name = '${j['name'] ?? ''}',
        imageUrl = j['imageUrl'] as String?,
        parentId = _intN(j['parentId']),
        hasCarFilter = j['hasCarFilter'] == true,
        children = (j['children'] as List? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(Category.fromJson)
            .toList();
}

class CategoryField {
  final int id;
  final String label;
  final String type; // TEXT | NUMBER | BOOLEAN | SELECT | MULTISELECT
  final String? unit;
  final List<String> options;
  final bool required;
  final bool showInForm;

  CategoryField.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']),
        label = '${j['label'] ?? ''}',
        type = '${j['type'] ?? 'TEXT'}',
        unit = j['unit'] as String?,
        options = (j['options'] as List? ?? []).map((e) => '$e').toList(),
        required = j['required'] == true,
        showInForm = j['showInForm'] != false;
}

class City {
  final int id;
  final String name;
  final String type;
  final String? regionName;

  const City.all()
      : id = 0,
        name = 'Все города',
        type = 'ALL',
        regionName = null;

  City.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']),
        name = '${j['name'] ?? ''}',
        type = '${j['type'] ?? 'CITY'}',
        regionName = (j['region'] is Map) ? '${j['region']['name']}' : null;
}

class CarModel {
  final int id;
  final String name;
  final String? generation;
  final int yearFrom;
  final int? yearTo;

  CarModel.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']),
        name = '${j['name'] ?? ''}',
        generation = j['generation'] as String?,
        yearFrom = _int(j['yearFrom']),
        yearTo = _intN(j['yearTo']);

  String get label {
    final years = '$yearFrom–${yearTo ?? 'н.в.'}';
    return generation != null && generation!.isNotEmpty ? '$name $generation ($years)' : '$name ($years)';
  }
}

class UserProfile {
  final int id;
  final String email;
  final String? name;
  final String? phone;
  final String? avatarUrl;
  final String role;
  final IdName? city;

  UserProfile.fromJson(Map<String, dynamic> j)
      : id = _int(j['id']),
        email = '${j['email'] ?? ''}',
        name = j['name'] as String?,
        phone = j['phone'] as String?,
        avatarUrl = j['avatarUrl'] as String?,
        role = '${j['role'] ?? 'USER'}',
        city = IdName.fromJson(j['city']);

  String get displayName => (name != null && name!.trim().isNotEmpty) ? name! : email;
}

/// Фильтры поиска — те же параметры, что у getListings на сайте.
class ListingFilter {
  String search;
  int? categoryId;
  String? categoryName;
  bool categoryHasCarFilter;
  int? cityId;
  String? cityName;
  int? minPrice;
  int? maxPrice;
  int? carMakeId;
  String? carMakeName;
  int? carModelId;
  String? carModelName;
  int? carYearFrom;
  int? carYearTo;

  ListingFilter({
    this.search = '',
    this.categoryId,
    this.categoryName,
    this.categoryHasCarFilter = false,
    this.cityId,
    this.cityName,
    this.minPrice,
    this.maxPrice,
    this.carMakeId,
    this.carMakeName,
    this.carModelId,
    this.carModelName,
    this.carYearFrom,
    this.carYearTo,
  });

  ListingFilter copy() => ListingFilter(
        search: search,
        categoryId: categoryId,
        categoryName: categoryName,
        categoryHasCarFilter: categoryHasCarFilter,
        cityId: cityId,
        cityName: cityName,
        minPrice: minPrice,
        maxPrice: maxPrice,
        carMakeId: carMakeId,
        carMakeName: carMakeName,
        carModelId: carModelId,
        carModelName: carModelName,
        carYearFrom: carYearFrom,
        carYearTo: carYearTo,
      );

  Map<String, String> toQuery() => {
        if (search.trim().isNotEmpty) 'search': search.trim(),
        if (categoryId != null) 'categoryId': '$categoryId',
        if (cityId != null) 'cityId': '$cityId',
        if (minPrice != null) 'minPrice': '$minPrice',
        if (maxPrice != null) 'maxPrice': '$maxPrice',
        if (carMakeId != null) 'carMakeId': '$carMakeId',
        if (carModelId != null) 'carModelId': '$carModelId',
        if (carYearFrom != null) 'carYearFrom': '$carYearFrom',
        if (carYearTo != null) 'carYearTo': '$carYearTo',
      };

  int get activeCount => [
        categoryId,
        cityId,
        minPrice,
        maxPrice,
        carMakeId,
        carModelId,
        carYearFrom,
        carYearTo,
      ].where((e) => e != null).length;
}
