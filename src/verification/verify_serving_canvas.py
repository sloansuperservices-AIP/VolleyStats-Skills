
import os
from playwright.sync_api import sync_playwright, expect

def verify_serving_canvas():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (assuming running on port 5173 based on Vite defaults)
        page.goto("http://localhost:3001")

        # Fill out Athlete Profile if present
        if page.is_visible("text=Athlete Profile"):
            page.fill("input[type='text']", "Test Athlete")
            page.fill("input[type='number']", "180")
            page.click("button[type='submit']")

        # Wait for dashboard to load
        page.wait_for_selector("text=Active Stations", timeout=10000)

        # Click on Station B: Serving Analysis (looking for the heading inside the button)
        page.click("text=Station B: Serving")

        # Wait for the Serving Tracker to load
        expect(page.get_by_text("Station B: Serving Analysis")).to_be_visible()

        # We need to upload a video to test the canvas.
        # We can use the 'sample.mp4' if it exists or any dummy video.
        # Using a dummy file creation for upload.

        # Check if sample.mp4 exists in root, otherwise create a dummy one
        if not os.path.exists("sample.mp4"):
            # Create a dummy file just to pass the upload check (browser might not play it, but we can see canvas)
            with open("sample.mp4", "wb") as f:
                f.write(b"dummy video content")

        # Upload video
        # Find the file input
        file_input = page.locator('input[type="file"]')
        file_input.set_input_files("sample.mp4")

        # Wait for video view to appear (canvas and video elements)
        page.wait_for_selector("video", timeout=10000)
        page.wait_for_selector("canvas", timeout=10000)

        # Wait a bit for layout to stabilize and ResizeObserver to fire
        page.wait_for_timeout(2000)

        # Click to draw court boundary (simulate clicks on canvas)
        # We need to click "Draw Court Boundary" button first if it's not already in drawing mode.
        # The button says "Draw Court Boundary" initially.
        page.click("text=Draw Court Boundary")

        # Get canvas bounding box
        canvas = page.locator("canvas")
        box = canvas.bounding_box()

        if box:
            print(f"Canvas box: {box}")
            # Click top-left and bottom-right to define court
            # We click relative to the canvas
            page.mouse.click(box["x"] + box["width"] * 0.2, box["y"] + box["height"] * 0.2)
            page.mouse.click(box["x"] + box["width"] * 0.8, box["y"] + box["height"] * 0.8)

        # Take screenshot
        screenshot_path = "verification/serving_canvas_verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_serving_canvas()
