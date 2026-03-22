import os
from playwright.sync_api import sync_playwright, expect

def verify_inference_error():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Intercept the API request and return a 403 error
        def handle_route(route):
            route.fulfill(
                status=403,
                content_type="application/json",
                body='{"error": "Forbidden"}'
            )

        page.route("**/api/ultralytics", handle_route)

        # Navigate to the app
        page.goto("http://localhost:3000")

        # Fill out Athlete Profile
        page.fill("input[placeholder='e.g. Jordan Larson']", "Test Athlete")
        page.fill("input[placeholder='180']", "180")
        page.click("button:has-text('Initialize Combine')")

        # Wait for dashboard to load
        page.wait_for_selector("text=Active Stations", timeout=10000)

        # Click on Station D: Setting (uses Tracker.tsx)
        page.click("text=Station D: Setting")

        # Wait for Tracker to load
        expect(page.get_by_text("Station D: Setting Analysis")).to_be_visible()

        # Check if sample.mp4 exists
        if not os.path.exists("sample.mp4"):
            with open("sample.mp4", "wb") as f:
                f.write(b"dummy video content")

        # Upload video
        file_input = page.locator('input[type="file"]')
        file_input.set_input_files("sample.mp4")

        # Wait for video and canvas
        page.wait_for_selector("video", timeout=10000)

        # Start Analysis
        page.click("text=Start Analysis")

        # Wait for error message to appear
        page.wait_for_selector("text=Inference API Authentication failed", timeout=10000)

        # Take screenshot of the error in Tracker
        page.screenshot(path="verification/tracker_error_verification.png")
        print("Tracker error screenshot saved.")

        # Go back to dashboard
        page.click("text=Back")

        # Click on Station B: Serving Analysis (uses ServingTracker.tsx)
        page.click("text=Station B: Serving")

        # Upload video
        file_input = page.locator('input[type="file"]')
        file_input.set_input_files("sample.mp4")

        # Start Analysis
        page.click("text=Start Analysis")

        # Wait for error message to appear
        page.wait_for_selector("text=Inference Error", timeout=10000)
        page.wait_for_selector("text=Inference API Authentication failed", timeout=10000)

        # Take screenshot of the error in ServingTracker
        page.screenshot(path="verification/serving_tracker_error_verification.png")
        print("ServingTracker error screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_inference_error()
