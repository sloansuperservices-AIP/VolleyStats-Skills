import cv2
import requests
import json
import os

def test_api():
    # 1. Extract frame
    vid_path = "sample.mp4"
    if not os.path.exists(vid_path):
        print("Video not found.")
        return

    cap = cv2.VideoCapture(vid_path)
    ret, frame = cap.read()
    cap.release()

    if not ret:
        print("Failed to read frame.")
        return

    cv2.imwrite("test_frame.jpg", frame)
    print("Extracted test_frame.jpg")

    # 2. Call API
    url = "https://predict.ultralytics.com"
    headers = {"x-api-key": "5ea02b4238fc9528408b8c36dcdb3834e11a9cbf58"}
    data = {"model": "https://hub.ultralytics.com/models/ITKRtcQHITZrgT2ZNpRq", "imgsz": 640, "conf": 0.25, "iou": 0.45}

    print("Sending request to API...")
    with open("test_frame.jpg", "rb") as f:
        response = requests.post(url, headers=headers, data=data, files={"file": f})

    if response.status_code != 200:
        print(f"Error: {response.status_code} - {response.text}")
        return

    result = response.json()
    print("API Response:")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    test_api()
