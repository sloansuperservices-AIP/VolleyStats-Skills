export const fetchInference = async (imageBlob: Blob) => {
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
        if (response.status === 0 || response.status === 403) {
           console.warn("API Request failed. This might be a CORS issue or Invalid Key.");
        }
        throw new Error(response.statusText);
      }

      const inferenceTime = Date.now() - startTime;
      const data = await response.json();

      return { data, inferenceTime };
    } catch (err) {
      console.error("Inference error:", err);
      return null;
    }
  };
