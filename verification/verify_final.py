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
            print("Filling athlete profile...")
            page.fill("input[placeholder='e.g. Jordan Larson']", "Bolt Tester")
            page.fill("input[type='number']", "190")
            page.click("button:has-text('Initialize Combine')")

            # 2. Wait for Main Menu
            # Use text from the screenshot
            page.wait_for_selector("text=Station B: Serving", timeout=5000)

            # 3. Nav to Station B (Serving)
            print("Navigating to Station B...")
            page.click("div:has-text('Station B: Serving')")
            page.wait_for_selector("h1:has-text('Station B: Serving Analysis')", timeout=5000)
            time.sleep(1)
            page.screenshot(path="verification/station_b.png")
            print("Verified Station B")

            # 4. Back
            page.click("button:has-text('Back')")
            page.wait_for_selector("text=Station D: Setting", timeout=5000)

            # 5. Nav to Station D (Setting) - which uses Tracker.tsx presumably?
            # Or Station C: Passing?
            # From earlier screenshot I saw "Station C: Passing" and "Station D: Setting".
            # Tracker.tsx has "Setting Tracker" in title.
            print("Navigating to Station D...")
            page.click("div:has-text('Station D: Setting')")
            page.wait_for_selector("h1:has-text('Setting Tracker')", timeout=5000)
            time.sleep(1)
            page.screenshot(path="verification/station_d.png")
            print("Verified Station D")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_final.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
