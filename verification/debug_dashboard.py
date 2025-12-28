from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3001/")

        # Onboard
        try:
             page.fill("input[placeholder='e.g. Jordan Larson']", "Test Athlete")
             page.fill("input[placeholder='180']", "190")
             page.click("button:has-text('Initialize Combine')")
        except:
             pass

        page.wait_for_timeout(2000) # wait a bit for render
        page.screenshot(path="verification/debug_dashboard.png")
        print("Screenshot saved to verification/debug_dashboard.png")
        print("Page text content:", page.content())
        browser.close()

if __name__ == "__main__":
    run()
