from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:5173")

            # 1. Fill out Athlete Profile correctly
            page.fill("input[placeholder='e.g. Jordan Larson']", "Bolt Tester")
            page.fill("input[type='number']", "190")
            page.click("button:has-text('Initialize Combine')")

            page.wait_for_selector("text=Station B: Serving", timeout=5000)

            # 2. Go to Station B
            print("Going to Station B...")
            page.locator("div").filter(has_text="Station B: Serving").last.click()
            page.wait_for_selector("text=Upload serving video", timeout=5000)

            page.screenshot(path="verification/station_b_final.png")
            print("Captured Station B")

            # 3. Go Back
            page.click("button:has-text('Back')")
            page.wait_for_selector("text=Station D: Setting", timeout=5000)

            # 4. Go to Station D (Setting) - Tracker.tsx
            print("Going to Station D...")
            # Note: Station D might be "Station D: Setting" or similar.
            # From previous attempts, Tracker.tsx is used for "Setting Tracker"
            page.locator("div").filter(has_text="Station D: Setting").last.click()

            page.wait_for_selector("text=Setting Tracker", timeout=5000)
            page.screenshot(path="verification/station_d_final.png")
            print("Captured Station D")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
