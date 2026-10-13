import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/models.dart';
import '../state/session.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/pickers.dart';

/// Создание/редактирование объявления — как app/add и app/edit.
/// Возвращает `true` через Navigator.pop, если объявление сохранено.
class AddListingScreen extends StatefulWidget {
  const AddListingScreen({super.key, this.editing});
  final Listing? editing;

  @override
  State<AddListingScreen> createState() => _AddListingScreenState();
}

class _AddListingScreenState extends State<AddListingScreen> {
  late final Api api = context.read<Session>().api;
  Listing? get _e => widget.editing;

  late final _title = TextEditingController(text: _e?.title ?? '');
  late final _description = TextEditingController(text: _e?.description.trim() ?? '');
  late final _price = TextEditingController(text: _e == null || _e!.price == 0 ? '' : _e!.price.round().toString());
  late final _carYear = TextEditingController(text: _e?.carYear?.toString() ?? '');

  late int? _categoryId = _e?.category?.id;
  late String? _categoryName = _e?.category?.name;
  late bool _hasCarFilter = _e?.categoryHasCarFilter ?? false;
  late int? _cityId = _e?.city?.id ?? context.read<Session>().user?.city?.id;
  late String? _cityName = _e?.city?.name ?? context.read<Session>().user?.city?.name;
  late int? _carMakeId = _e?.carMakeId;
  late String? _carMakeName = _e?.carMake?.name;
  late int? _carModelId = _e?.carModelId;
  late String? _carModelName = _e?.carModel?.name;

  List<CategoryField> _fields = [];
  late final Map<String, Object?> _attrs = {
    for (final a in _e?.attributes ?? <ListingAttribute>[]) '${a.fieldId}': a.raw,
  };
  final Map<int, TextEditingController> _attrControllers = {};

  late final List<ListingImage> _existing = [...?_e?.images];
  final List<XFile> _newFiles = [];

  bool _busy = false;
  String? _progress;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (_categoryId != null) _loadFields(_categoryId!);
  }

  Future<void> _loadFields(int categoryId) async {
    try {
      final fields = await api.categoryFields(categoryId);
      if (mounted) setState(() => _fields = fields.where((f) => f.showInForm).toList());
    } catch (_) {
      if (mounted) setState(() => _fields = []);
    }
  }

  bool get _canPublish =>
      _title.text.trim().length >= 3 &&
      (int.tryParse(_price.text) ?? 0) > 0 &&
      _description.text.trim().length >= 10 &&
      _categoryId != null;

  bool get _canDraft =>
      _title.text.trim().isNotEmpty || _description.text.trim().isNotEmpty || (int.tryParse(_price.text) ?? 0) > 0;

  Map<String, dynamic> _payload() {
    final attributes = <String, Object?>{};
    for (final f in _fields) {
      final v = _attrs['${f.id}'];
      if (v == null || (v is String && v.isEmpty) || (v is List && v.isEmpty)) continue;
      attributes['${f.id}'] = v;
    }
    return {
      'title': _title.text.trim().isEmpty ? 'Черновик' : _title.text.trim(),
      'description': _description.text.trim().isEmpty ? ' ' : _description.text.trim(),
      'price': int.tryParse(_price.text) ?? 0,
      if (_categoryId != null) 'categoryId': _categoryId,
      if (_cityId != null) 'cityId': _cityId,
      if (_hasCarFilter && _carMakeId != null) 'carMakeId': _carMakeId,
      if (_hasCarFilter && _carModelId != null) 'carModelId': _carModelId,
      if (_hasCarFilter && int.tryParse(_carYear.text) != null) 'carYear': int.parse(_carYear.text),
      'attributes': attributes,
    };
  }

  Future<void> _submit({bool draft = false}) async {
    if (_busy) return;
    if (!draft && !_canPublish) {
      setState(() => _error = 'Заполните категорию, название (от 3 символов), описание (от 10 символов) и цену');
      return;
    }
    if (draft && !_canDraft) {
      setState(() => _error = 'Заполните хотя бы название, описание или цену');
      return;
    }
    for (final f in _fields.where((f) => f.required)) {
      final v = _attrs['${f.id}'];
      if (!draft && (v == null || (v is String && v.isEmpty) || (v is List && v.isEmpty))) {
        setState(() => _error = 'Заполните поле «${f.label}»');
        return;
      }
    }
    setState(() {
      _busy = true;
      _error = null;
      _progress = 'Сохраняем объявление...';
    });
    try {
      final payload = _payload();
      final int id;
      if (_e == null) {
        // Как на сайте: без категории черновик падает в категорию 1.
        payload['categoryId'] ??= 1;
        final created = await api.createListing({...payload, 'status': draft ? 'DRAFT' : 'PUBLISHED'});
        id = created.id;
      } else {
        await api.updateListing(_e!.id, payload);
        id = _e!.id;
      }
      final hasCover = _existing.any((i) => i.isImage);
      for (var i = 0; i < _newFiles.length; i++) {
        setState(() => _progress = 'Загружаем фото ${i + 1} из ${_newFiles.length}...');
        await api.uploadListingMedia(id, _newFiles[i].path, cover: !hasCover && i == 0);
      }
      if (!mounted) return;
      showInfo(context, _e != null ? 'Изменения сохранены' : (draft ? 'Черновик сохранён' : 'Объявление опубликовано'));
      Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : '$e');
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _progress = null;
        });
      }
    }
  }

  Future<void> _addPhotos(ImageSource source) async {
    final picker = ImagePicker();
    final total = _existing.length + _newFiles.length;
    if (total >= 10) {
      showInfo(context, 'Можно добавить не более 10 файлов');
      return;
    }
    List<XFile> picked;
    if (source == ImageSource.camera) {
      final f = await picker.pickImage(source: source, maxWidth: 1920, maxHeight: 1920, imageQuality: 85);
      picked = f == null ? [] : [f];
    } else {
      picked = await picker.pickMultiImage(maxWidth: 1920, maxHeight: 1920, imageQuality: 85, limit: 10 - total);
    }
    if (picked.isEmpty) return;
    setState(() => _newFiles.addAll(picked.take(10 - total)));
  }

  Future<void> _removeExisting(ListingImage img) async {
    try {
      await api.deleteListingMedia(_e!.id, img.id);
      setState(() => _existing.remove(img));
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final editing = _e != null;
    return Scaffold(
      appBar: AppBar(title: Text(editing ? 'Редактирование' : 'Новое объявление')),
      body: AbsorbPointer(
        absorbing: _busy,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 8, 14, 32),
          children: [
            _section('Основное', [
              Labeled(
                'Категория *',
                SelectField(
                  value: _categoryName,
                  hint: 'Выберите категорию',
                  onTap: () async {
                    final o = await pickCategory(context, api);
                    if (o == null) return;
                    setState(() {
                      _categoryId = o.category.id;
                      _categoryName = o.category.name;
                      _hasCarFilter = o.category.hasCarFilter;
                      _fields = [];
                      _attrs.clear();
                      _attrControllers.clear();
                    });
                    _loadFields(o.category.id);
                  },
                ),
              ),
              Labeled(
                'Название *',
                TextField(
                  controller: _title,
                  maxLength: 120,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(hintText: 'Например, iPhone 13 128 ГБ', counterText: ''),
                ),
              ),
              Labeled(
                'Описание *',
                TextField(
                  controller: _description,
                  minLines: 5,
                  maxLines: 12,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(hintText: 'Состояние, комплектация, особенности'),
                ),
              ),
              Labeled(
                'Цена, ₽ *',
                TextField(
                  controller: _price,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(hintText: '0'),
                ),
              ),
              Labeled(
                'Город',
                SelectField(
                  value: _cityName,
                  hint: 'Выберите город',
                  onTap: () async {
                    final c = await pickCity(context, api, allowAll: false);
                    if (c != null) {
                      setState(() {
                        _cityId = c.id;
                        _cityName = c.name;
                      });
                    }
                  },
                ),
              ),
            ]),
            if (_hasCarFilter) _carSection(),
            if (_fields.isNotEmpty) _section('Характеристики', [for (final f in _fields) _attrField(f)]),
            _photosSection(),
            if (_error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0x14EF4444),
                  borderRadius: BorderRadius.circular(T.rSm),
                  border: Border.all(color: const Color(0x33EF4444)),
                ),
                child: Text(_error!, style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13)),
              ),
            FilledButton(
              onPressed: _busy ? null : () => _submit(),
              child: _busy
                  ? Row(mainAxisSize: MainAxisSize.min, children: [
                      const SizedBox(
                          width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                      const SizedBox(width: 10),
                      Text(_progress ?? ''),
                    ])
                  : Text(editing ? 'Сохранить изменения' : 'Опубликовать'),
            ),
            if (!editing) ...[
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: _busy ? null : () => _submit(draft: true),
                child: const Text('Сохранить черновик'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _section(String title, List<Widget> children) => Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
        decoration: T.cardDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      );

  Widget _carSection() => _section('Автомобиль', [
        Labeled(
          'Марка',
          SelectField(
            value: _carMakeName,
            hint: 'Выберите марку',
            onTap: () async {
              final m = await pickCarMake(context, api);
              if (m == null) return;
              setState(() {
                _carMakeId = m.id;
                _carMakeName = m.name;
                _carModelId = null;
                _carModelName = null;
              });
            },
            onClear: () => setState(() {
              _carMakeId = _carModelId = null;
              _carMakeName = _carModelName = null;
            }),
          ),
        ),
        if (_carMakeId != null)
          Labeled(
            'Модель',
            SelectField(
              value: _carModelName,
              hint: 'Выберите модель',
              onTap: () async {
                final m = await pickCarModel(context, api, _carMakeId!);
                if (m == null) return;
                setState(() {
                  _carModelId = m.id;
                  _carModelName = m.name;
                });
              },
              onClear: () => setState(() {
                _carModelId = null;
                _carModelName = null;
              }),
            ),
          ),
        Labeled(
          'Год выпуска',
          TextField(
            controller: _carYear,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(4)],
            decoration: const InputDecoration(hintText: 'Например, 2015'),
          ),
        ),
      ]);

  /// Динамические поля категории — как DynamicCategoryFields.tsx.
  Widget _attrField(CategoryField f) {
    final key = '${f.id}';
    final label = '${f.label}${f.unit != null ? ', ${f.unit}' : ''}${f.required ? ' *' : ''}';
    final value = _attrs[key];
    switch (f.type) {
      case 'SELECT':
      case 'BOOLEAN':
        final options = f.type == 'BOOLEAN' ? ['Да', 'Нет'] : f.options;
        final display = f.type == 'BOOLEAN' ? (value == null ? null : (value == true ? 'Да' : 'Нет')) : value as String?;
        return Labeled(
          label,
          DropdownButtonFormField<String>(
            initialValue: options.contains(display) ? display : null,
            isExpanded: true,
            hint: const Text('Выберите значение', style: TextStyle(color: T.mutedLight, fontSize: 14)),
            items: [for (final o in options) DropdownMenuItem(value: o, child: Text(o))],
            onChanged: (v) => setState(() => _attrs[key] = f.type == 'BOOLEAN' ? v == 'Да' : v),
          ),
        );
      case 'MULTISELECT':
        final selected = (value as List?)?.cast<String>() ?? <String>[];
        return Labeled(
          label,
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final o in f.options)
              FilterChip(
                label: Text(o),
                selected: selected.contains(o),
                selectedColor: T.brandLight,
                checkmarkColor: T.brand,
                side: const BorderSide(color: T.line),
                onSelected: (on) => setState(() {
                  final next = [...selected];
                  on ? next.add(o) : next.remove(o);
                  _attrs[key] = next;
                }),
              ),
          ]),
        );
      default:
        final c = _attrControllers.putIfAbsent(f.id, () => TextEditingController(text: value?.toString() ?? ''));
        final isNumber = f.type == 'NUMBER';
        return Labeled(
          label,
          TextField(
            controller: c,
            keyboardType: isNumber ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
            onChanged: (v) => _attrs[key] = isNumber ? (v.isEmpty ? null : num.tryParse(v.replaceAll(',', '.'))) : v,
          ),
        );
    }
  }

  Widget _photosSection() {
    Widget tile({required Widget child, required VoidCallback onRemove, bool cover = false}) => Stack(children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(T.rSm),
            child: SizedBox(width: 92, height: 92, child: child),
          ),
          if (cover)
            Positioned(
              left: 4,
              bottom: 4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: T.brand, borderRadius: BorderRadius.circular(999)),
                child: const Text('Обложка', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w600)),
              ),
            ),
          Positioned(
            right: 4,
            top: 4,
            child: GestureDetector(
              onTap: onRemove,
              child: Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(color: Color(0xCC111827), shape: BoxShape.circle),
                child: const Icon(Icons.close, size: 14, color: Colors.white),
              ),
            ),
          ),
        ]);

    final coverExisting = _existing.where((i) => i.isImage).firstOrNull;
    final cover = _existing.firstWhere((i) => i.isImage && i.isCover, orElse: () => coverExisting ?? _dummy);
    return _section('Фото', [
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final img in _existing)
          tile(
            child: img.isImage
                ? NetImage(img.url, iconSize: 20)
                : const ColoredBox(color: Color(0xFF111827), child: Icon(Icons.videocam, color: Colors.white)),
            cover: identical(img, cover),
            onRemove: () => _removeExisting(img),
          ),
        for (var i = 0; i < _newFiles.length; i++)
          tile(
            child: Image.file(File(_newFiles[i].path), fit: BoxFit.cover),
            cover: coverExisting == null && i == 0,
            onRemove: () => setState(() => _newFiles.removeAt(i)),
          ),
        _addTile(Icons.add_photo_alternate_outlined, 'Галерея', () => _addPhotos(ImageSource.gallery)),
        _addTile(Icons.photo_camera_outlined, 'Камера', () => _addPhotos(ImageSource.camera)),
      ]),
      const SizedBox(height: 10),
      Text('До 10 фото. Первое фото станет обложкой.', style: T.mutedText.copyWith(fontSize: 12)),
      const SizedBox(height: 12),
    ]);
  }

  Widget _addTile(IconData icon, String label, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(T.rSm),
        child: Container(
          width: 92,
          height: 92,
          decoration: BoxDecoration(
            color: T.brandLight,
            borderRadius: BorderRadius.circular(T.rSm),
            border: Border.all(color: const Color(0x332563EB)),
          ),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, color: T.brand),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(color: T.brand, fontSize: 11, fontWeight: FontWeight.w600)),
          ]),
        ),
      );
}

final _dummy = ListingImage.fromJson(const {'id': -1, 'url': '', 'type': 'none'});
