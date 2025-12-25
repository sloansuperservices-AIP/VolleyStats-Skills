from playwright.sync_api import sync_playwright

def verify_app_loads():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3001")
            page.wait_for_load_state("networkidle")

            # Use specific selectors for the onboarding form
            if page.locator("text=Athlete Profile").is_visible():
                print("Filling Athlete Profile...")
                # The label might not be exactly "Full Name" or might need exact match
                page.locator("input[type='text']").first.fill("Test User")
                page.locator("input[type='number']").fill("180")
                page.locator("select").select_option("OH")

                # The button text is "Initialize Combine"
                page.get_by_role("button", name="Initialize Combine").click()
                page.wait_for_load_state("networkidle")

            # Click on 'Station D: Setting' (which has tracker id)
            print("Navigating to Station D: Setting...")
            page.locator("text=Station D: Setting").click()
            page.wait_for_timeout(2000) # Wait for component to mount

            # Verify canvas exists
            canvas = page.locator("canvas")
            if canvas.count() > 0:
                print("Canvas element found.")
            else:
                print("Canvas element NOT found.")

            page.screenshot(path="verification/tracker_load.png")
            print("Tracker screenshot saved.")

            # Go back
            page.get_by_text("Back").click()
            page.wait_for_timeout(1000)

            # Click on 'Station B: Serving'
            print("Navigating to Station B: Serving...")
            page.locator("text=Station B: Serving").click()
            page.wait_for_timeout(2000)

             # Verify canvas exists
            canvas = page.locator("canvas")
            if canvas.count() > 0:
                print("Canvas element found.")
            else:
                print("Canvas element NOT found.")

            page.screenshot(path="verification/serving_load.png")
            print("Serving screenshot saved.")

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app_loads()
