import type { Area } from "react-easy-crop";

export type ExportMimeType = "image/jpeg" | "image/png" | "image/webp";

export type CropImageOptions = {
  imageSrc: string;
  pixelCrop: Area;
  targetWidth: number;
  targetHeight: number;
  rotation?: number;
  mimeType: ExportMimeType;
  quality?: number;
  backgroundColor?: string;
};

function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Could not load image.")),
    );
    image.setAttribute("crossOrigin", "anonymous");
    image.src = src;
  });
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function rotatedDimensions(
  width: number,
  height: number,
  rotation: number,
): {
  width: number;
  height: number;
} {
  const rotationInRadians = degreesToRadians(rotation);

  return {
    width:
      Math.abs(Math.cos(rotationInRadians) * width) +
      Math.abs(Math.sin(rotationInRadians) * height),
    height:
      Math.abs(Math.sin(rotationInRadians) * width) +
      Math.abs(Math.cos(rotationInRadians) * height),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: ExportMimeType,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image export failed."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

export async function exportCroppedImage(
  options: CropImageOptions,
): Promise<Blob> {
  const {
    imageSrc,
    pixelCrop,
    targetWidth,
    targetHeight,
    rotation = 0,
    mimeType,
    quality = 0.95,
    backgroundColor = "#ffffff",
  } = options;

  const image = await createImage(imageSrc);
  const bounds = rotatedDimensions(image.width, image.height, rotation);
  const radians = degreesToRadians(rotation);

  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = Math.round(bounds.width);
  rotatedCanvas.height = Math.round(bounds.height);

  const rotatedContext = rotatedCanvas.getContext("2d");

  if (!rotatedContext) {
    throw new Error("Could not create drawing context.");
  }

  rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  rotatedContext.rotate(radians);
  rotatedContext.drawImage(image, -image.width / 2, -image.height / 2);

  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = targetWidth;
  resultCanvas.height = targetHeight;

  const resultContext = resultCanvas.getContext("2d");

  if (!resultContext) {
    throw new Error("Could not create export context.");
  }

  if (mimeType !== "image/png") {
    resultContext.fillStyle = backgroundColor;
    resultContext.fillRect(0, 0, targetWidth, targetHeight);
  }

  resultContext.drawImage(
    rotatedCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return canvasToBlob(resultCanvas, mimeType, quality);
}
