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

            # Click Station B
            print("Clicking Station B...")
            # Use get_by_text to be more specific, or click the card itself?
            # It seems the click might not be registering if it's a div.
            # Let's try force click.
            page.click("div:has-text('Station B: Serving')", force=True)

            # Check if we navigated
            try:
                page.wait_for_selector("h1:has-text('Station B: Serving Analysis')", timeout=3000)
                print("Navigated to Station B")
                page.screenshot(path="verification/station_b_success.png")
            except:
                print("Failed to navigate to Station B")
                page.screenshot(path="verification/station_b_fail.png")

            # Try Station D (Setting)
            if page.locator("button:has-text('Back')").is_visible():
                page.click("button:has-text('Back')")
                page.wait_for_selector("text=Station D: Setting", timeout=5000)

            print("Clicking Station D...")
            page.click("div:has-text('Station D: Setting')", force=True)

            try:
                page.wait_for_selector("h1:has-text('Setting Tracker')", timeout=3000)
                print("Navigated to Station D")
                page.screenshot(path="verification/station_d_success.png")
            except:
                print("Failed to navigate to Station D")
                page.screenshot(path="verification/station_d_fail.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
