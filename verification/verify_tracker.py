from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:3001/")

        # Onboard
        try:
             page.wait_for_selector("input[placeholder='e.g. Jordan Larson']", timeout=3000)
             page.fill("input[placeholder='e.g. Jordan Larson']", "Test Athlete")
             page.fill("input[placeholder='180']", "190")
             page.click("button:has-text('Initialize Combine')")
             print("Onboarding passed")
        except:
             print("Already onboarded or not found")

        # In the output HTML, I see:
        # Station B: Serving -> text="Station B: Serving"
        # Station D: Setting -> text="Station D: Setting"

        # Wait for dashboard
        page.wait_for_selector("text=Combine Status", timeout=10000)

        # Click on Station D: Setting (which is the tracker)
        print("Clicking Station D: Setting...")
        page.click("text=Station D: Setting")

        # Wait for Tracker page (Setting Tracker)
        page.wait_for_selector("h1:has-text('Setting Tracker')")
        print("Setting Tracker page loaded.")

        # Take screenshot of Tracker page
        page.screenshot(path="verification/tracker_page.png")
        print("Screenshot saved to verification/tracker_page.png")

        # Go back
        page.click("text=Back")

        # Wait for dashboard again
        page.wait_for_selector("text=Combine Status")

        # Click on Station B: Serving (Serving Analysis)
        print("Clicking Station B: Serving...")
        page.click("text=Station B: Serving")

        # Wait for Serving Analysis page
        page.wait_for_selector("h1:has-text('Station B: Serving Analysis')")
        print("Serving Analysis page loaded.")

        # Take screenshot of Serving Analysis page
        page.screenshot(path="verification/serving_page.png")
        print("Screenshot saved to verification/serving_page.png")

        browser.close()

if __name__ == "__main__":
    run()
