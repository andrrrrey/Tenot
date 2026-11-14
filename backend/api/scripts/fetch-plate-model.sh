#!/bin/sh
# Модель поиска госномеров для размытия на фото (п. 2.3):
# open-image-models (MIT), YOLOv9-tiny 640, end2end ONNX — https://github.com/ankandrew/open-image-models
# Скачивается при сборке Docker-образа; локально: sh scripts/fetch-plate-model.sh
set -eu
DEST="${1:-models/plate-detector.onnx}"
URL="https://github.com/ankandrew/open-image-models/releases/download/assets/yolo-v9-t-640-license-plates-end2end.onnx"
SHA256="c3c1026ca7d0585dd88084d68182dd897113712fa734ae1557ca70174440c076"

mkdir -p "$(dirname "$DEST")"
if [ -f "$DEST" ] && echo "$SHA256  $DEST" | sha256sum -c - >/dev/null 2>&1; then
  echo "plate model: already present ($DEST)"
  exit 0
fi
curl -fsSL --retry 5 -o "$DEST.tmp" "$URL"
echo "$SHA256  $DEST.tmp" | sha256sum -c -
mv "$DEST.tmp" "$DEST"
echo "plate model: saved to $DEST"
