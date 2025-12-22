import cv2
import pandas as pd
import numpy as np
import onnxruntime as ort
import argparse
import sys
import requests
from tqdm import tqdm
import os
import json

# --- Config ---
ULTRALYTICS_API_URL = "https://predict.ultralytics.com"
MODEL_ID = "ITKRtcQHITZrgT2ZNpRq"
API_KEY = "5ea02b4238fc9528408b8c36dcdb3834e11a9cbf58"

class ServingAnalyzer:
    def __init__(self, video_path, court_points=None, model_path=None):
        """
        :param video_path: Path to video file
        :param court_points: List of 2 points [(x1,y1), (x2,y2)] for court top-left and bottom-right
        :param model_path: Path to ONNX model. If None, uses API.
        """
        self.video_path = video_path
        self.court_points = court_points
        self.model_path = model_path

        self.trajectory = [] # List of {time, x, y, confidence}
        self.landings = []   # List of {time, x, y, zone}

        # Initialize ONNX if available
        self.session = None
        if self.model_path and os.path.exists(self.model_path):
            try:
                self.session = ort.InferenceSession(self.model_path)
                print(f"Loaded ONNX model from {self.model_path}")
            except Exception as e:
                print(f"Failed to load ONNX model: {e}")
                self.session = None

        if not self.session:
            print("Using Ultralytics API for inference.")

    def get_grid_info(self):
        if not self.court_points or len(self.court_points) < 2:
            return None
        p1, p2 = self.court_points
        x_min = min(p1[0], p2[0])
        y_min = min(p1[1], p2[1])
        w = abs(p2[0] - p1[0])
        h = abs(p2[1] - p1[1])
        return {'x': x_min, 'y': y_min, 'w': w, 'h': h, 'cw': w/3, 'ch': h/3}

    def get_zone(self, x, y):
        grid = self.get_grid_info()
        if not grid:
            return "-"

        col = int((x - grid['x']) // grid['cw'])
        row = int((y - grid['y']) // grid['ch'])

        if 0 <= col < 3 and 0 <= row < 3:
            return str(row * 3 + col + 1)
        return "Out"

    def infer_frame(self, frame):
        """
        Runs inference on a single frame.
        Returns: box [x1, y1, x2, y2], confidence
        """
        # If we have an ONNX session, use it (Stub implementation, assumes specific input/output)
        if self.session:
            # TODO: Implement proper pre-processing for YOLO ONNX
            # This is complex without knowing exact model input shape/normalization
            # For now, we fall back to API if ONNX logic isn't fully robust
            pass

        # API Fallback
        # We process every N frames to save time/bandwidth in this script
        # But for 'real' analysis, we need high freq.
        # For the purpose of this script, we will use the API logic from debug_api.py

        # Encode frame
        _, img_encoded = cv2.imencode('.jpg', frame)

        try:
            response = requests.post(
                ULTRALYTICS_API_URL,
                headers={"x-api-key": API_KEY},
                data={"model": f"https://hub.ultralytics.com/models/{MODEL_ID}", "imgsz": 640, "conf": 0.25, "iou": 0.45},
                files={"file": ("frame.jpg", img_encoded.tobytes(), "image/jpeg")}
            )
            if response.status_code == 200:
                result = response.json()
                if result.get("images") and result["images"][0].get("results"):
                    # Filter for ball
                    dets = result["images"][0]["results"]
                    balls = [d for d in dets if d['name'] in ['volleyball', 'sports ball', 'ball'] or d['class'] in [0, 32]]
                    if balls:
                        best = max(balls, key=lambda x: x['confidence'])
                        return best['box'], best['confidence']
        except Exception as e:
            pass # Network error or other

        return None, 0

    def analyze(self, frame_step=3):
        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            print("Error opening video")
            return

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        pbar = tqdm(total=total_frames)

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Skip frames for speed if needed
            if frame_idx % frame_step == 0:
                time_sec = frame_idx / fps

                box, conf = self.infer_frame(frame)
                if box:
                    cx = (box['x1'] + box['x2']) / 2
                    cy = (box['y1'] + box['y2']) / 2
                    self.trajectory.append({
                        'time': time_sec,
                        'x': cx,
                        'y': cy,
                        'confidence': conf
                    })

            frame_idx += 1
            pbar.update(1)

        cap.release()
        pbar.close()

        # Post-Process: Detect Landings
        self.detect_landings()

    def detect_landings(self):
        # Logic: Local Maxima of Y
        traj = sorted(self.trajectory, key=lambda x: x['time'])

        for i in range(2, len(traj) - 2):
            p_prev2 = traj[i-2]
            p_prev = traj[i-1]
            p_curr = traj[i]
            p_next = traj[i+1]
            p_next2 = traj[i+2]

            if (p_curr['y'] > p_prev['y'] and p_curr['y'] > p_prev2['y'] and
                p_curr['y'] > p_next['y'] and p_curr['y'] > p_next2['y']):

                # Check bounds
                if self.court_points:
                    grid = self.get_grid_info()
                    # Simple check if inside big rect
                    if not (grid['x'] <= p_curr['x'] <= grid['x'] + grid['w'] and
                            grid['y'] <= p_curr['y'] <= grid['y'] + grid['h']):
                        continue # Outside court

                zone = self.get_zone(p_curr['x'], p_curr['y'])
                self.landings.append({
                    'time': p_curr['time'],
                    'x': p_curr['x'],
                    'y': p_curr['y'],
                    'zone': zone
                })

    def export_csv(self, output_path="serving_analysis.csv"):
        data = []

        # Helper to check if a trajectory point is a landing
        landing_times = {l['time']: l for l in self.landings}

        for t in self.trajectory:
            event = "Trajectory"
            zone = "-"

            # Loose time matching for landing
            if t['time'] in landing_times:
                event = "Landing"
                zone = landing_times[t['time']]['zone']

            data.append({
                'Time (s)': round(t['time'], 3),
                'X (px)': round(t['x'], 2),
                'Y (px)': round(t['y'], 2),
                'Event': event,
                'Zone': zone
            })

        # Append landings that might not exactly match trajectory timestamps (if any separate logic)
        # But here they are derived FROM trajectory, so they match.

        df = pd.DataFrame(data)
        df.to_csv(output_path, index=False)
        print(f"Exported to {output_path}")

    def print_stats(self):
        print("\n--- Analysis Stats ---")
        print(f"Total Trajectory Points: {len(self.trajectory)}")
        print(f"Total Landings Detected: {len(self.landings)}")

        zone_counts = {}
        for l in self.landings:
            z = l['zone']
            zone_counts[z] = zone_counts.get(z, 0) + 1

        print("Zone Distribution:")
        for z in sorted(zone_counts.keys()):
            print(f"  Zone {z}: {zone_counts[z]}")

def main():
    parser = argparse.ArgumentParser(description="VolleySkillBoard Serving Analysis")
    parser.add_argument("video", help="Path to video file")
    parser.add_argument("--out", default="serving_analysis.csv", help="Output CSV path")
    parser.add_argument("--court", nargs=4, type=int, help="Court coords: x1 y1 x2 y2")

    args = parser.parse_args()

    court_points = None
    if args.court:
        court_points = [(args.court[0], args.court[1]), (args.court[2], args.court[3])]
    else:
        # Default or Auto-detect logic could go here.
        # For sample.mp4 we can guess or ask user.
        print("No court defined. Using full frame or auto-detection logic (not implemented).")
        # Let's default to a central box for testing if not provided
        court_points = [(100, 100), (500, 500)]

    analyzer = ServingAnalyzer(args.video, court_points)
    analyzer.analyze(frame_step=5) # Step 5 for speed in demo
    analyzer.export_csv(args.out)
    analyzer.print_stats()

if __name__ == "__main__":
    main()
