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

            # 1. Fill out Athlete Profile
            print("Filling athlete profile...")
            # Use specific selectors if placeholders fail
            page.fill("input[type='text']", "Bolt Tester")
            page.click("button:has-text('Initialize Combine')")

            time.sleep(2)
            page.screenshot(path="verification/after_profile.png")
            print("Saved after_profile.png")

            # Dump page content to see what's there
            # print(page.content())

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_debug.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
