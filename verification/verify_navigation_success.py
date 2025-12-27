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
            # Use specific selectors if placeholders fail
            page.fill("input[placeholder='e.g. Jordan Larson']", "Bolt Tester")
            # It seems Height is also required? "Please fill out this field" popup on screenshot.
            # But the screenshot shows 180 filled in.
            # Maybe I need to fill it explicitly again or click out?
            # Or maybe the first input was focused and I clicked the button and it validated?
            # The error popup is pointing to the button or the form?
            # It points to the button, but says "Please fill out this field". Wait, looking at screenshot again.
            # It points to the button? No, it looks like a browser validation tooltip.

            # Let's fill all fields explicitly
            page.fill("input[type='number']", "185")

            page.click("button:has-text('Initialize Combine')")

            # 2. Wait for Main Menu
            print("Waiting for main menu...")
            page.wait_for_selector("text=Station B: Serving Analysis", timeout=5000)

            # Take screenshot of Main Menu
            page.screenshot(path="verification/main_menu.png")

            # 3. Nav to Station B
            page.click("div:has-text('Station B: Serving Analysis')")
            page.wait_for_selector("h1:has-text('Station B: Serving Analysis')", timeout=5000)
            page.screenshot(path="verification/station_b.png")
            print("Verified Station B")

            # 4. Back
            page.click("button:has-text('Back')")
            page.wait_for_selector("text=Station C: Setting Accuracy", timeout=5000)

            # 5. Nav to Station C
            page.click("div:has-text('Station C: Setting Accuracy')")
            page.wait_for_selector("h1:has-text('Setting Tracker')", timeout=5000)
            page.screenshot(path="verification/station_c.png")
            print("Verified Station C")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_success.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
