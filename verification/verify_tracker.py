
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    try:
        # 1. Load Page
        print("Navigating to app...")
        page.goto("http://localhost:5173")

        # 2. Onboarding
        print("Filling onboarding...")
        page.fill("input[placeholder='e.g. Jordan Larson']", "Test Athlete")
        page.fill("input[placeholder='180']", "180")

        # Click Initialize
        page.click("text=Initialize Combine")

        # 3. Wait for Dashboard
        page.wait_for_selector("text=Combine Status")
        print("Dashboard loaded.")

        # 4. Go to Tracker (Station D)
        print("Navigating to Tracker...")
        page.click("text=Station D: Setting")

        # 5. Wait for Tracker to load
        page.wait_for_selector("text=Setting Tracker")
        print("Tracker loaded.")

        # 6. Screenshot
        screenshot_path = "verification/tracker_loaded.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
