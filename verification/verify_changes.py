from playwright.sync_api import sync_playwright

def verify_app_loads():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the app (assuming default vite port 5173)
            page.goto("http://localhost:3001")

            # Wait for "Athlete Profile" header
            page.wait_for_selector("text=Athlete Profile", timeout=10000)

            # Fill in the form
            page.fill("input[placeholder='e.g. Jordan Larson']", "Bolt Tester")
            page.fill("input[placeholder='180']", "180")

            # Click Initialize Combine
            page.click("button:has-text('Initialize Combine')")

            # Wait for Dashboard (look for Combine Status or Station list)
            page.wait_for_selector("text=Combine Status", timeout=10000)

            # Click Station D: Setting
            page.click("text=Station D: Setting")

            # Wait for Tracker
            page.wait_for_selector("text=Setting Tracker", timeout=10000)

            # Take a screenshot to verify it loaded correctly
            page.screenshot(path="verification/app_loaded.png")
            print("Screenshot saved to verification/app_loaded.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app_loads()
