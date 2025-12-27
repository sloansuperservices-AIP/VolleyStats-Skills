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
            page.click("div:has-text('Station B: Serving')")

            time.sleep(2)
            page.screenshot(path="verification/station_b_attempt.png")
            print("Saved screenshot of where we landed")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
