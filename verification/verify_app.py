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

            # Wait for content to load
            print("Waiting for content...")
            # Check for any of the main buttons from index.tsx (Station A, B, C)
            # Since I haven't read index.tsx, I'll dump the text content if I can't find specific things.
            # But I know ServingTracker has "Station B: Serving Analysis" title.

            # Let's wait for body to be visible at least
            page.wait_for_selector("body", state="visible")
            time.sleep(2) # Give it a moment to render

            page.screenshot(path="verification/app_load.png")
            print("Screenshot saved to verification/app_load.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
