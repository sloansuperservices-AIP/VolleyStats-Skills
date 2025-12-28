from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3001/")
        page.wait_for_timeout(2000) # wait a bit for render
        page.screenshot(path="verification/debug_home.png")
        print("Screenshot saved to verification/debug_home.png")
        print("Page text content:", page.content())
        browser.close()

if __name__ == "__main__":
    run()
