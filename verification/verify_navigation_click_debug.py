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

            # Print page content to check structure
            # print(page.content())

            # Locate the Station B card
            card = page.locator("div").filter(has_text="Station B: Serving").last

            if card.count() > 0:
                print("Found Station B card")
                # Highlight it for screenshot
                card.evaluate("el => el.style.border = '5px solid red'")
                page.screenshot(path="verification/card_highlight.png")

                # Click it
                print("Clicking card...")
                card.click()

                # Check navigation
                time.sleep(2)
                page.screenshot(path="verification/after_card_click.png")

                if page.locator("text=Back").is_visible():
                     print("Navigation successful!")
                else:
                     print("Navigation failed.")
            else:
                print("Could not find Station B card")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
