import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:panorama_viewer/panorama_viewer.dart';
import 'package:provider/provider.dart';

import '../state/session.dart';

/// Полноэкранный просмотр панорамы салона 360°: пальцем или поворотом телефона.
class PanoramaViewScreen extends StatefulWidget {
  const PanoramaViewScreen({super.key, required this.listingId});
  final int listingId;

  @override
  State<PanoramaViewScreen> createState() => _PanoramaViewScreenState();
}

class _PanoramaViewScreenState extends State<PanoramaViewScreen> {
  String? _url;
  bool _error = false;
  bool _sensors = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = false);
    try {
      final api = context.read<Session>().api;
      final interior = (await api.media360(widget.listingId)).interior;
      final url = api.media(interior?.url);
      if (url == null) throw Exception('no panorama');
      if (mounted) setState(() => _url = url);
    } catch (_) {
      if (mounted) setState(() => _error = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final url = _url;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Салон 360°'),
        actions: [
          IconButton(
            tooltip: _sensors ? 'Управление пальцем' : 'Двигать телефоном',
            onPressed: () => setState(() => _sensors = !_sensors),
            icon: Icon(_sensors ? Icons.screen_rotation : Icons.touch_app_outlined),
          ),
        ],
      ),
      body: _error
          ? Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Text('Не удалось загрузить панораму', style: TextStyle(color: Colors.white)),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: _load, child: const Text('Повторить')),
              ]),
            )
          : url == null
              ? const Center(child: CircularProgressIndicator(color: Colors.white))
              : PanoramaViewer(
                  key: ValueKey(_sensors),
                  sensorControl: _sensors ? SensorControl.orientation : SensorControl.none,
                  minZoom: 1,
                  maxZoom: 4,
                  child: Image(
                    image: CachedNetworkImageProvider(url, headers: const {'user-agent': 'TenotApp/1.0 (Flutter)'}),
                  ),
                ),
    );
  }
}
