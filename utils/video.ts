export const MAX_INFERENCE_DIM = 640;

export const calculateScalingRatio = (width: number, height: number, maxDim: number = MAX_INFERENCE_DIM) => {
  return Math.min(1, maxDim / Math.max(width, height));
};

export const extractFrameFromVideo = async (
  video: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
  ctx?: CanvasRenderingContext2D, // Optional: reuse context/canvas
  quality: number = 0.8
): Promise<Blob | null> => {
  if (!ctx) {
     const canvas = document.createElement('canvas');
     canvas.width = targetWidth;
     canvas.height = targetHeight;
     // Optimization: willReadFrequently forces software rendering or optimized readback path
     // which is significantly faster for operations like toBlob() or getImageData()
     ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  }

  // Ensure canvas matches target dimensions if reused
  if (ctx.canvas.width !== targetWidth) ctx.canvas.width = targetWidth;
  if (ctx.canvas.height !== targetHeight) ctx.canvas.height = targetHeight;

  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

  return new Promise<Blob | null>(res => ctx!.canvas.toBlob(res, 'image/jpeg', quality));
};
