export interface InferenceResponse {
  data: any | null;
  inferenceTime: number;
  error?: string;
}

export const fetchInference = async (imageBlob: Blob): Promise<InferenceResponse> => {
    try {
      const startTime = Date.now();

      const formData = new FormData();
      formData.append('model', 'https://hub.ultralytics.com/models/ITKRtcQHITZrgT2ZNpRq');
      formData.append('imgsz', '640');
      formData.append('conf', '0.25');
      formData.append('iou', '0.45');
      formData.append('file', imageBlob, 'frame.jpg');

      // Always use the proxy endpoint (works in both dev and production via Netlify function)
      const apiUrl = '/api/ultralytics';

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let message = "Inference request failed";
        if (response.status === 403) {
          message = "Inference API Authentication failed. Check your API key.";
        } else if (response.status === 404) {
          message = "Inference model not found.";
        } else if (response.status === 429) {
          message = "Too many requests. Please try again later.";
        } else if (response.status >= 500) {
          message = "Inference server error. Please try again later.";
        }
        throw new Error(`${message} (${response.status})`);
      }

      const inferenceTime = Date.now() - startTime;
      const data = await response.json();

      return { data, inferenceTime };
    } catch (err: any) {
      return {
        data: null,
        inferenceTime: 0,
        error: err instanceof Error ? err.message : "An unexpected error occurred during inference."
      };
    }
  };
