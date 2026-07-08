import pytest
from playwright.sync_api import Page, expect

def test_smoke_page_loads(page: Page, local_server: str):
    # Navigate to the local server
    page.goto(local_server)
    
    # Verify the title
    assert page.title() == "MighTea Boba Inventory Tracker"
    
    # Verify key selectors are visible
    inventory_wrapper = page.locator("#inventoryWrapper")
    search_input = page.locator("#searchInput")
    error_log = page.locator("#errorLog")
    
    expect(inventory_wrapper).to_be_visible()
    expect(search_input).to_be_visible()
    
    # The error log starts empty, which has display: none in CSS. Verify it is attached first.
    expect(error_log).to_be_hidden()
    expect(error_log).to_be_attached()
    
    # Log a dummy error to verify that it becomes visible when not empty
    page.evaluate("window.logError('0x999_TEST', 'Self-Test Smoke Alert')")
    expect(error_log).to_be_visible()

def test_offline_firebase_fallback(page: Page, local_server: str):
    # Set up global firebase config so initCloudStorage attempts to load
    page.add_init_script("window.__firebase_config = '{\"apiKey\": \"mock-api-key\"}';")
    
    # Route all gstatic.com requests to fail (simulating offline)
    page.route("https://www.gstatic.com/**", lambda route: route.abort())
    
    # Navigate to the local server
    page.goto(local_server)
    
    # Verify elements are visible
    inventory_wrapper = page.locator("#inventoryWrapper")
    search_input = page.locator("#searchInput")
    error_log = page.locator("#errorLog")
    
    expect(inventory_wrapper).to_be_visible()
    expect(search_input).to_be_visible()
    
    # Since imports fail, the error log should capture the initialization error and be visible
    expect(error_log).to_be_visible()
    expect(error_log).to_contain_text("ERR_0x00A_CLOUD_INIT")
