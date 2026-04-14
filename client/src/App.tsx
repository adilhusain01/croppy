import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { exportCroppedImage, type ExportMimeType } from "../lib/crop-image";
import {
  type CropPreset,
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
type CustomInputMode = "ratio" | "pixels";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.5;
const CROP_NUDGE_STEP = 2;
const CUSTOM_RATIO_PRESET_ID = "ratio-custom";
const DEFAULT_BACKGROUND_FILL_COLOR = "#000000";
const MAX_CUSTOM_PIXEL_DIMENSION = 12000;

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

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));

  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }

  return x || 1;
}

function parseRatioInput(value: string): {
  width: number;
  height: number;
} | null {
  const match = value.trim().match(/^(\d{1,5})\s*:\s*(\d{1,5})$/);

  if (!match) {
    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  if (width <= 0 || height <= 0) {
    return null;
  }

  const divisor = greatestCommonDivisor(width, height);

  return {
    width: Math.max(1, Math.round(width / divisor)),
    height: Math.max(1, Math.round(height / divisor)),
  };
}

function toCustomTargetSize(
  ratioWidth: number,
  ratioHeight: number,
): {
  width: number;
  height: number;
} {
  const longEdge = 1920;

  if (ratioWidth >= ratioHeight) {
    return {
      width: longEdge,
      height: Math.max(1, Math.round((longEdge * ratioHeight) / ratioWidth)),
    };
  }

  return {
    width: Math.max(1, Math.round((longEdge * ratioWidth) / ratioHeight)),
    height: longEdge,
  };
}

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const isValid = /^#([\da-f]{3}|[\da-f]{6})$/i.test(trimmed);

  if (!isValid) {
    return null;
  }

  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }

  return trimmed;
}

function parsePixelDimensionInput(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d{1,5}$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed)) {
    return null;
  }

  if (parsed <= 0 || parsed > MAX_CUSTOM_PIXEL_DIMENSION) {
    return null;
  }

  return parsed;
}

function parsePixelPairInput(value: string): {
  width: number;
  height: number;
} | null {
  const match = value.trim().match(/^(\d{1,5})\s*(?:x|:|\/|,)\s*(\d{1,5})$/i);

  if (!match) {
    return null;
  }

  const parsedWidth = parsePixelDimensionInput(match[1]);
  const parsedHeight = parsePixelDimensionInput(match[2]);

  if (!parsedWidth || !parsedHeight) {
    return null;
  }

  return {
    width: parsedWidth,
    height: parsedHeight,
  };
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
  const [customInputMode, setCustomInputMode] =
    useState<CustomInputMode>("ratio");
  const [customRatioInput, setCustomRatioInput] = useState("16:9");
  const [customRatio, setCustomRatio] = useState({ width: 16, height: 9 });
  const [customPixelWidthInput, setCustomPixelWidthInput] = useState("1920");
  const [customPixelHeightInput, setCustomPixelHeightInput] = useState("1080");
  const [customPixelSize, setCustomPixelSize] = useState({
    width: 1920,
    height: 1080,
  });
  const [backgroundFillColor, setBackgroundFillColor] = useState(
    DEFAULT_BACKGROUND_FILL_COLOR,
  );
  const [backgroundFillColorInput, setBackgroundFillColorInput] = useState(
    DEFAULT_BACKGROUND_FILL_COLOR,
  );
  const [message, setMessage] = useState(
    "Drop an image and start slicing for every network.",
  );
  const [isExporting, setIsExporting] = useState(false);
  const activeBlobUrl = useRef<string | null>(null);

  const selectedPlatform = useMemo(
    () => getGroupById(selectedPlatformId) ?? PLATFORM_PRESET_GROUPS[0],
    [selectedPlatformId],
  );

  const customRatioPreset = useMemo<CropPreset>(() => {
    if (customInputMode === "pixels") {
      return {
        id: CUSTOM_RATIO_PRESET_ID,
        label: `Custom Pixels (${customPixelSize.width}x${customPixelSize.height})`,
        width: customPixelSize.width,
        height: customPixelSize.height,
      };
    }

    const dimensions = toCustomTargetSize(
      customRatio.width,
      customRatio.height,
    );

    return {
      id: CUSTOM_RATIO_PRESET_ID,
      label: `Custom Ratio (W:H)`,
      width: dimensions.width,
      height: dimensions.height,
    };
  }, [
    customInputMode,
    customPixelSize.height,
    customPixelSize.width,
    customRatio.height,
    customRatio.width,
  ]);

  const availablePresets = useMemo(() => {
    if (selectedPlatform.id !== "ratios") {
      return selectedPlatform.presets;
    }

    return [...selectedPlatform.presets, customRatioPreset];
  }, [customRatioPreset, selectedPlatform]);

  const selectedPreset = useMemo(() => {
    const fromSelected = availablePresets.find(
      (preset) => preset.id === selectedPresetId,
    );
    return fromSelected ?? availablePresets[0];
  }, [availablePresets, selectedPresetId]);

  const aspectRatio = selectedPreset.width / selectedPreset.height;
  const simplifiedAspectRatio = useMemo(() => {
    const divisor = greatestCommonDivisor(
      selectedPreset.width,
      selectedPreset.height,
    );
    return `${selectedPreset.width / divisor}:${selectedPreset.height / divisor}`;
  }, [selectedPreset.height, selectedPreset.width]);
  const isRoundCrop = selectedPreset.shape === "round";

  useEffect(() => {
    setSelectedPresetId((currentPresetId) => {
      const isCustomPresetForRatios =
        selectedPlatform.id === "ratios" &&
        currentPresetId === CUSTOM_RATIO_PRESET_ID;
      const isPresetInCurrentPlatform = selectedPlatform.presets.some(
        (preset) => preset.id === currentPresetId,
      );

      if (isCustomPresetForRatios || isPresetInCurrentPlatform) {
        return currentPresetId;
      }

      return selectedPlatform.presets[0].id;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, [selectedPlatformId, selectedPlatform.id, selectedPlatform.presets]);

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

  const applyCustomInput = useCallback(() => {
    if (customInputMode === "ratio") {
      const parsedRatio = parseRatioInput(customRatioInput);

      if (!parsedRatio) {
        setMessage(
          "Custom ratio must use Width:Height (for example 7:5 or 9:16).",
        );
        return;
      }

      setCustomRatio(parsedRatio);
      const targetDimensions = toCustomTargetSize(
        parsedRatio.width,
        parsedRatio.height,
      );
      setCustomPixelWidthInput(String(targetDimensions.width));
      setCustomPixelHeightInput(String(targetDimensions.height));
      setCustomPixelSize(targetDimensions);
      setMessage(
        `Custom ratio ${parsedRatio.width}:${parsedRatio.height} applied. Drag to frame manually.`,
      );
    } else {
      const pairFromWidthInput = parsePixelPairInput(customPixelWidthInput);
      const pairFromHeightInput = parsePixelPairInput(customPixelHeightInput);
      const inferredPair = pairFromWidthInput ?? pairFromHeightInput;

      const parsedWidth =
        inferredPair?.width ?? parsePixelDimensionInput(customPixelWidthInput);
      const parsedHeight =
        inferredPair?.height ??
        parsePixelDimensionInput(customPixelHeightInput);

      if (!parsedWidth || !parsedHeight) {
        setMessage(
          `Pixel mode needs whole-number Width and Height between 1 and ${MAX_CUSTOM_PIXEL_DIMENSION}.`,
        );
        return;
      }

      setCustomPixelSize({
        width: parsedWidth,
        height: parsedHeight,
      });
      setCustomPixelWidthInput(String(parsedWidth));
      setCustomPixelHeightInput(String(parsedHeight));

      const divisor = greatestCommonDivisor(parsedWidth, parsedHeight);
      const normalizedRatio = {
        width: parsedWidth / divisor,
        height: parsedHeight / divisor,
      };
      setCustomRatio(normalizedRatio);
      setCustomRatioInput(`${normalizedRatio.width}:${normalizedRatio.height}`);
      setMessage(
        `Custom pixels ${parsedWidth}x${parsedHeight} applied. Drag to frame manually.`,
      );
    }

    setSelectedPlatformId("ratios");
    setSelectedPresetId(CUSTOM_RATIO_PRESET_ID);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, [
    customInputMode,
    customPixelHeightInput,
    customPixelWidthInput,
    customRatioInput,
  ]);

  const onCustomInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      applyCustomInput();
    },
    [applyCustomInput],
  );

  const onBackgroundFillColorTextBlur = useCallback(() => {
    const normalized = normalizeHexColor(backgroundFillColorInput);

    if (!normalized) {
      setBackgroundFillColorInput(backgroundFillColor);
      setMessage("Use a valid HEX color like #000000 or #0f172a.");
      return;
    }

    setBackgroundFillColor(normalized);
    setBackgroundFillColorInput(normalized);
  }, [backgroundFillColor, backgroundFillColorInput]);

  const resetView = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setMessage("View reset to fit.");
  }, []);

  const nudgeCrop = useCallback((deltaX: number, deltaY: number) => {
    setCrop((currentCrop) => ({
      x: Number((currentCrop.x + deltaX).toFixed(2)),
      y: Number((currentCrop.y + deltaY).toFixed(2)),
    }));
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
        backgroundColor: backgroundFillColor,
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
    backgroundFillColor,
    rotation,
    selectedPreset,
  ]);

  const safeZone = selectedPreset.safeZone;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(251,180,0,0.18),transparent_36%),radial-gradient(circle_at_82%_6%,rgba(13,148,136,0.2),transparent_33%),radial-gradient(circle_at_50%_88%,rgba(233,95,32,0.2),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[linear-gradient(180deg,rgba(9,20,31,0.08),transparent)]" />

      <main className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 pb-12 pt-10 sm:px-8 lg:px-10">
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
              Aspect {simplifiedAspectRatio} ({aspectRatio.toFixed(3)}:1)
            </p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(230px,300px)_minmax(0,1fr)_minmax(230px,300px)]">
          <aside className="glass-panel grid content-start gap-4 p-4 sm:p-5 lg:col-start-1 lg:row-start-2 xl:col-start-auto xl:row-start-auto">
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
                  if (event.target.value === CUSTOM_RATIO_PRESET_ID) {
                    setSelectedPresetId(CUSTOM_RATIO_PRESET_ID);
                    setMessage(
                      "Custom mode selected. Enter ratio or pixels below.",
                    );
                    return;
                  }

                  const nextPreset = getPresetById(event.target.value);
                  if (nextPreset) {
                    setSelectedPresetId(nextPreset.id);
                    setMessage(`Preset switched to ${nextPreset.label}.`);
                  }
                }}
                className="control-input"
              >
                {availablePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 rounded-2xl border border-[var(--panel-border)] bg-[rgba(255,255,255,0.75)] p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="control-label" htmlFor="customRatioInput">
                  Customize
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--panel-border)] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setCustomInputMode("ratio")}
                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
                      customInputMode === "ratio"
                        ? "bg-[var(--teal-700)] text-white"
                        : "text-[var(--ink)] hover:bg-[rgba(16,31,46,0.08)]"
                    }`}
                  >
                    Ratio
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomInputMode("pixels")}
                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
                      customInputMode === "pixels"
                        ? "bg-[var(--teal-700)] text-white"
                        : "text-[var(--ink)] hover:bg-[rgba(16,31,46,0.08)]"
                    }`}
                  >
                    Pixels
                  </button>
                </div>
              </div>

              {customInputMode === "ratio" ? (
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    id="customRatioInput"
                    type="text"
                    inputMode="numeric"
                    value={customRatioInput}
                    onChange={(event) =>
                      setCustomRatioInput(event.target.value)
                    }
                    onKeyDown={onCustomInputKeyDown}
                    className="control-input"
                    placeholder="16:9"
                  />
                  <button
                    type="button"
                    onClick={applyCustomInput}
                    className="rounded-xl bg-[var(--teal-700)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--teal-600)]"
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    id="customPixelWidthInput"
                    type="text"
                    inputMode="numeric"
                    value={customPixelWidthInput}
                    onChange={(event) =>
                      setCustomPixelWidthInput(event.target.value)
                    }
                    onKeyDown={onCustomInputKeyDown}
                    className="control-input"
                    placeholder="Width"
                  />
                  <input
                    id="customPixelHeightInput"
                    type="text"
                    inputMode="numeric"
                    value={customPixelHeightInput}
                    onChange={(event) =>
                      setCustomPixelHeightInput(event.target.value)
                    }
                    onKeyDown={onCustomInputKeyDown}
                    className="control-input"
                    placeholder="Height"
                  />
                  <button
                    type="button"
                    onClick={applyCustomInput}
                    className="rounded-xl bg-[var(--teal-700)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--teal-600)]"
                  >
                    Apply
                  </button>
                </div>
              )}

              <p className="text-xs text-[var(--muted-ink)]">
                {customInputMode === "ratio"
                  ? "Use Width:Height (for example 11:8, 3:2, 9:16)."
                  : `Use exact Width and Height in pixels (1-${MAX_CUSTOM_PIXEL_DIMENSION}). You can also paste 300:300 or 1920x1080 into either field.`}
              </p>
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
          </aside>

          <section className="glass-panel grid gap-4 p-4 sm:p-5 lg:col-span-2 lg:row-start-1 xl:col-span-1 xl:row-start-auto">
            <div
              className="relative h-[clamp(320px,54vh,700px)] overflow-hidden rounded-2xl border border-[var(--panel-border)] md:h-[clamp(360px,58vh,760px)] xl:h-[clamp(400px,60vh,820px)]"
              style={{
                background: imageSource
                  ? backgroundFillColor
                  : "linear-gradient(150deg,#081520,#123149)",
              }}
            >
              {imageSource ? (
                <>
                  <Cropper
                    image={imageSource}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspectRatio}
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    cropShape={isRoundCrop ? "round" : "rect"}
                    restrictPosition={false}
                    showGrid
                    style={{
                      containerStyle: {
                        backgroundColor: backgroundFillColor,
                      },
                    }}
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
          </section>

          <aside className="glass-panel grid content-start gap-4 p-4 sm:p-5 lg:col-start-2 lg:row-start-2 xl:col-start-auto xl:row-start-auto">
            <div className="grid gap-4 rounded-2xl border border-[var(--panel-border)] bg-[rgba(255,255,255,0.75)] p-3">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="control-label" htmlFor="zoomRange">
                    Zoom ({zoom.toFixed(2)}x)
                  </label>
                  <button
                    type="button"
                    onClick={resetView}
                    disabled={!imageSource}
                    title="Reset crop view"
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:border-[var(--teal-600)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 2v6h-6" />
                      <path d="M3 12a9 9 0 0 1 15.5-6.36L21 8" />
                      <path d="M3 22v-6h6" />
                      <path d="M21 12a9 9 0 0 1-15.5 6.36L3 16" />
                    </svg>
                    Reset
                  </button>
                </div>
                <input
                  id="zoomRange"
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="control-range"
                  disabled={!imageSource}
                />
              </div>

              <div className="grid gap-2">
                <p className="control-label">
                  Nudge image ({CROP_NUDGE_STEP}px)
                </p>
                <div className="grid justify-items-center gap-2">
                  <button
                    type="button"
                    onClick={() => nudgeCrop(0, -CROP_NUDGE_STEP)}
                    disabled={!imageSource}
                    className="inline-flex min-w-20 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:border-[var(--teal-600)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Up
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => nudgeCrop(-CROP_NUDGE_STEP, 0)}
                      disabled={!imageSource}
                      className="inline-flex min-w-20 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:border-[var(--teal-600)] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeCrop(CROP_NUDGE_STEP, 0)}
                      disabled={!imageSource}
                      className="inline-flex min-w-20 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:border-[var(--teal-600)] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Right
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => nudgeCrop(0, CROP_NUDGE_STEP)}
                    disabled={!imageSource}
                    className="inline-flex min-w-20 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)] transition hover:border-[var(--teal-600)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Down
                  </button>
                </div>
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
                  PNG ignores quality. Background fill color always applies to
                  uncovered areas.
                </p>
              </div>

              <div className="grid gap-2">
                <label className="control-label" htmlFor="fillColorText">
                  Background fill color
                </label>
                <div className="grid grid-cols-[52px_1fr] gap-2">
                  <input
                    id="fillColorPicker"
                    type="color"
                    value={backgroundFillColor}
                    onChange={(event) => {
                      const nextColor = event.target.value.toLowerCase();
                      setBackgroundFillColor(nextColor);
                      setBackgroundFillColorInput(nextColor);
                    }}
                    className="h-10 w-full cursor-pointer rounded-lg border border-[var(--panel-border)] bg-white p-1"
                    aria-label="Choose background fill color"
                  />
                  <input
                    id="fillColorText"
                    type="text"
                    value={backgroundFillColorInput}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setBackgroundFillColorInput(nextValue);

                      const normalized = normalizeHexColor(nextValue);
                      if (normalized) {
                        setBackgroundFillColor(normalized);
                      }
                    }}
                    onBlur={onBackgroundFillColorTextBlur}
                    className="control-input"
                    placeholder="#000000"
                    spellCheck={false}
                  />
                </div>
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
        </section>
      </main>
    </div>
  );
}
