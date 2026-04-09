import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { exportCroppedImage, type ExportMimeType } from "../lib/crop-image";
import {
  DEFAULT_PLATFORM_ID,
  DEFAULT_PRESET_ID,
  getGroupById,
  getPresetById,
  PLATFORM_PRESET_GROUPS,
} from "../lib/presets";

const OUTPUT_FORMATS = {
  jpeg: {
    mimeType: "image/jpeg" as ExportMimeType,
    extension: "jpg",
    label: "JPG",
  },
  png: {
    mimeType: "image/png" as ExportMimeType,
    extension: "png",
    label: "PNG",
  },
  webp: {
    mimeType: "image/webp" as ExportMimeType,
    extension: "webp",
    label: "WEBP",
  },
};

type OutputFormatKey = keyof typeof OUTPUT_FORMATS;

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function createFileName(
  baseName: string,
  presetId: string,
  extension: string,
): string {
  const cleanName = baseName
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${cleanName || "croppy-export"}-${presetId}.${extension}`;
}

export default function App() {
  const [selectedPlatformId, setSelectedPlatformId] =
    useState(DEFAULT_PLATFORM_ID);
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET_ID);
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [fileName, setFileName] = useState("croppy-image");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormatKey>("jpeg");
  const [quality, setQuality] = useState(92);
  const [message, setMessage] = useState(
    "Drop an image and start slicing for every network.",
  );
  const [isExporting, setIsExporting] = useState(false);
  const activeBlobUrl = useRef<string | null>(null);

  const selectedPlatform = useMemo(
    () => getGroupById(selectedPlatformId) ?? PLATFORM_PRESET_GROUPS[0],
    [selectedPlatformId],
  );

  const selectedPreset = useMemo(() => {
    const fromSelected = selectedPlatform.presets.find(
      (preset) => preset.id === selectedPresetId,
    );
    return fromSelected ?? selectedPlatform.presets[0];
  }, [selectedPlatform, selectedPresetId]);

  const aspectRatio = selectedPreset.width / selectedPreset.height;
  const isRoundCrop = selectedPreset.shape === "round";

  useEffect(() => {
    setSelectedPresetId(selectedPlatform.presets[0].id);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, [selectedPlatformId, selectedPlatform.presets]);

  useEffect(() => {
    return () => {
      if (activeBlobUrl.current) {
        URL.revokeObjectURL(activeBlobUrl.current);
      }
    };
  }, []);

  const onCropComplete = useCallback((_area: Area, croppedAreaPixels: Area) => {
    setCropPixels(croppedAreaPixels);
  }, []);

  const onFileSelect = useCallback((file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file (PNG, JPG, WEBP, etc.).");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setMessage("That file is too large. Use an image smaller than 25 MB.");
      return;
    }

    if (activeBlobUrl.current) {
      URL.revokeObjectURL(activeBlobUrl.current);
      activeBlobUrl.current = null;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    activeBlobUrl.current = nextObjectUrl;

    setImageSource(nextObjectUrl);
    setFileName(file.name || "croppy-image");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setMessage("Image ready. Adjust crop, then export.");
  }, []);

  const onFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFileSelect(event.target.files?.[0]);
      event.target.value = "";
    },
    [onFileSelect],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      onFileSelect(event.dataTransfer.files?.[0]);
    },
    [onFileSelect],
  );

  const exportImage = useCallback(async () => {
    if (!imageSource || !cropPixels) {
      setMessage("Upload an image and move the crop area before exporting.");
      return;
    }

    const format = OUTPUT_FORMATS[outputFormat];

    setIsExporting(true);

    try {
      const blob = await exportCroppedImage({
        imageSrc: imageSource,
        pixelCrop: cropPixels,
        targetWidth: selectedPreset.width,
        targetHeight: selectedPreset.height,
        rotation,
        mimeType: format.mimeType,
        quality: quality / 100,
      });

      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");

      downloadLink.href = objectUrl;
      downloadLink.download = createFileName(
        fileName,
        selectedPreset.id,
        format.extension,
      );
      downloadLink.click();

      URL.revokeObjectURL(objectUrl);
      setMessage(`Downloaded ${selectedPreset.label} in ${format.label}.`);
    } catch {
      setMessage(
        "Could not export that crop. Try adjusting zoom or rotation and retry.",
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    cropPixels,
    fileName,
    imageSource,
    outputFormat,
    quality,
    rotation,
    selectedPreset,
  ]);

  const safeZone = selectedPreset.safeZone;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(251,180,0,0.18),transparent_36%),radial-gradient(circle_at_82%_6%,rgba(13,148,136,0.2),transparent_33%),radial-gradient(circle_at_50%_88%,rgba(233,95,32,0.2),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[linear-gradient(180deg,rgba(9,20,31,0.08),transparent)]" />

      <main className="relative mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 pb-12 pt-10 sm:px-8 lg:px-10">
        <header className="grid gap-5 rounded-[30px] border border-[var(--panel-border)] bg-[var(--panel)] p-6 shadow-[0_24px_80px_rgba(6,22,37,0.2)] backdrop-blur-lg md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.36em] text-[var(--teal-700)]">
              Croppy Social Studio
            </p>
            <h1 className="font-display mt-2 text-3xl leading-[1.03] text-[var(--ink)] sm:text-5xl">
              One upload,
              <br />
              every social format.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--muted-ink)] sm:text-base">
              Build crisp exports for banners, stories, thumbnails, and profile
              avatars without leaving the browser.
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-[var(--panel-border)] bg-[rgba(255,255,255,0.66)] p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted-ink)]">
              Current target
            </p>
            <p className="font-display text-2xl text-[var(--ink)]">
              {selectedPreset.label}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-[var(--panel-border)] bg-[rgba(255,255,255,0.75)] px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--muted-ink)]">
                  Width
                </p>
                <p className="font-display text-xl text-[var(--ink)]">
                  {selectedPreset.width}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] bg-[rgba(255,255,255,0.75)] px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--muted-ink)]">
                  Height
                </p>
                <p className="font-display text-xl text-[var(--ink)]">
                  {selectedPreset.height}
                </p>
              </div>
            </div>
            <p className="font-mono text-xs text-[var(--muted-ink)]">
              Aspect {aspectRatio.toFixed(3)} : 1
            </p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="glass-panel grid content-start gap-4 p-4 sm:p-5">
            <div className="grid gap-2">
              <label className="control-label" htmlFor="platformSelect">
                Platform
              </label>
              <select
                id="platformSelect"
                value={selectedPlatformId}
                onChange={(event) => {
                  setSelectedPlatformId(event.target.value);
                  setMessage("Platform changed. Pick a preset and crop.");
                }}
                className="control-input"
              >
                {PLATFORM_PRESET_GROUPS.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="control-label" htmlFor="presetSelect">
                Preset
              </label>
              <select
                id="presetSelect"
                value={selectedPreset.id}
                onChange={(event) => {
                  const nextPreset = getPresetById(event.target.value);
                  if (nextPreset) {
                    setSelectedPresetId(nextPreset.id);
                    setMessage(`Preset switched to ${nextPreset.label}.`);
                  }
                }}
                className="control-input"
              >
                {selectedPlatform.presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <label
              htmlFor="uploadInput"
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              className="group relative grid cursor-pointer place-items-center gap-1 rounded-2xl border border-dashed border-[var(--teal-500)] bg-[rgba(17,153,142,0.07)] px-4 py-8 text-center transition hover:bg-[rgba(17,153,142,0.12)]"
            >
              <input
                id="uploadInput"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onFileInputChange}
              />
              <span className="font-display text-2xl text-[var(--ink)]">
                Drop image
              </span>
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--teal-700)]">
                or click to upload
              </span>
              <span className="text-[11px] text-[var(--muted-ink)]">
                Max 25 MB · PNG JPG WEBP
              </span>
            </label>

            <div className="grid gap-4 rounded-2xl border border-[var(--panel-border)] bg-[rgba(255,255,255,0.75)] p-3">
              <div className="grid gap-2">
                <label className="control-label" htmlFor="zoomRange">
                  Zoom ({zoom.toFixed(2)}x)
                </label>
                <input
                  id="zoomRange"
                  type="range"
                  min={1}
                  max={3.5}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="control-range"
                  disabled={!imageSource}
                />
              </div>

              <div className="grid gap-2">
                <label className="control-label" htmlFor="rotationRange">
                  Rotation ({rotation.toFixed(0)}°)
                </label>
                <input
                  id="rotationRange"
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(event) => setRotation(Number(event.target.value))}
                  className="control-range"
                  disabled={!imageSource}
                />
              </div>

              <div className="grid gap-2">
                <label className="control-label" htmlFor="formatSelect">
                  Output format
                </label>
                <select
                  id="formatSelect"
                  value={outputFormat}
                  onChange={(event) =>
                    setOutputFormat(event.target.value as OutputFormatKey)
                  }
                  className="control-input"
                >
                  {(Object.keys(OUTPUT_FORMATS) as OutputFormatKey[]).map(
                    (formatKey) => (
                      <option key={formatKey} value={formatKey}>
                        {OUTPUT_FORMATS[formatKey].label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="control-label" htmlFor="qualityRange">
                  Quality ({quality}%)
                </label>
                <input
                  id="qualityRange"
                  type="range"
                  min={70}
                  max={100}
                  step={1}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="control-range"
                  disabled={!imageSource || outputFormat === "png"}
                />
                <p className="text-xs text-[var(--muted-ink)]">
                  PNG ignores quality to preserve full transparency.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void exportImage()}
                disabled={isExporting || !imageSource || !cropPixels}
                className="rounded-2xl bg-[linear-gradient(120deg,var(--teal-600),var(--teal-700))] px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isExporting ? "Exporting..." : "Download Crop"}
              </button>
            </div>
          </aside>

          <section className="glass-panel grid gap-4 p-4 sm:p-5">
            <div className="relative h-[52vh] min-h-[360px] overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[linear-gradient(150deg,#081520,#123149)]">
              {imageSource ? (
                <>
                  <Cropper
                    image={imageSource}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspectRatio}
                    cropShape={isRoundCrop ? "round" : "rect"}
                    showGrid
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                  />
                  {safeZone ? (
                    <div className="pointer-events-none absolute inset-0 grid place-items-center">
                      <div
                        className="relative border border-dashed border-[rgba(255,255,255,0.85)] bg-[rgba(5,16,26,0.2)]"
                        style={{
                          width: `${(safeZone.width / selectedPreset.width) * 100}%`,
                          height: `${(safeZone.height / selectedPreset.height) * 100}%`,
                        }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-[rgba(5,16,26,0.85)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                          {safeZone.label}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="grid h-full place-items-center p-8 text-center">
                  <div>
                    <p className="font-display text-4xl text-white">
                      Studio is waiting.
                    </p>
                    <p className="mt-2 max-w-md text-sm text-[rgba(255,255,255,0.8)]">
                      Upload one source image and crop it for all major social
                      and web formats.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2 rounded-2xl border border-[var(--panel-border)] bg-[rgba(255,255,255,0.75)] p-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted-ink)]">
                Status
              </p>
              <p className="text-sm text-[var(--ink)]">{message}</p>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
