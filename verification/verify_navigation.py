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

            # 1. Fill out Athlete Profile to get to main menu
            print("Filling athlete profile...")
            page.fill('input[placeholder="e.g. Jordan Larson"]', "Bolt Tester")
            page.click("button:has-text('Initialize Combine')")

            # 2. Wait for Main Menu
            print("Waiting for main menu...")
            page.wait_for_selector("text=Station B: Serving Analysis", timeout=5000)

            # 3. Navigate to Serving Tracker (Station B)
            print("Navigating to Station B...")
            page.click("div:has-text('Station B: Serving Analysis')") # Assuming card is clickable or button inside
            # Use a more robust selector if needed, e.g. finding the button in that card

            # 4. Verify Serving Tracker Loaded
            print("Verifying Serving Tracker...")
            page.wait_for_selector("h1:has-text('Station B: Serving Analysis')", timeout=5000)

            # Take screenshot of Serving Tracker
            time.sleep(1)
            page.screenshot(path="verification/serving_tracker.png")
            print("Screenshot saved to verification/serving_tracker.png")

            # 5. Go Back and go to Station C (Tracker.tsx) which is likely "Station C: Setting Accuracy" or similar
            page.click("button:has-text('Back')")
            page.wait_for_selector("text=Station C: Setting Accuracy", timeout=5000)
            print("Navigating to Station C...")
            page.click("div:has-text('Station C: Setting Accuracy')")

            print("Verifying Setting Tracker...")
            page.wait_for_selector("h1:has-text('Setting Tracker')", timeout=5000)

            time.sleep(1)
            page.screenshot(path="verification/setting_tracker.png")
            print("Screenshot saved to verification/setting_tracker.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_nav.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
