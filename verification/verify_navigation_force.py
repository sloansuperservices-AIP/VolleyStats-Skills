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
            page.fill("input[type='number']", "190") # Change value to be sure

            # Force click or double click?
            page.click("button:has-text('Initialize Combine')")

            time.sleep(2)
            page.screenshot(path="verification/after_click.png")

            # Check if we are still on profile?
            if page.locator("text=Athlete Profile").is_visible():
                print("Still on profile page. Validation failed?")
            else:
                print("Moved past profile page?")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
