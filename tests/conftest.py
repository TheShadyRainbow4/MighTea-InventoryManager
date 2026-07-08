import pytest
import subprocess
import socket
import time
import os
import sys

@pytest.fixture(scope="session")
def local_server():
    # Find a free port
    s = socket.socket()
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()

    # Start the server in the project root
    project_root = r"Z:\MighTea-InventoryManager"
    cmd = [sys.executable, "-m", "http.server", str(port)]
    process = subprocess.Popen(cmd, cwd=project_root)
    
    # Wait for the server to start
    start_time = time.time()
    while time.time() - start_time < 5:
        try:
            with socket.create_connection(("localhost", port), timeout=0.5):
                break
        except (socket.timeout, ConnectionRefusedError):
            time.sleep(0.1)
    else:
        process.terminate()
        raise RuntimeError("Failed to start local HTTP server")

    yield f"http://localhost:{port}"

    process.terminate()
    process.wait()

@pytest.fixture(scope="session")
def browser_type_launch_args(browser_name):
    user_profile = os.environ.get("USERPROFILE", "")
    playwright_cache = os.path.join(user_profile, "AppData", "Local", "ms-playwright")
    
    cache_empty = True
    if os.path.exists(playwright_cache) and os.path.isdir(playwright_cache):
        if os.listdir(playwright_cache):
            cache_empty = False
            
    args = {}
    if cache_empty:
        if browser_name == "firefox":
            firefox_path = r"C:\Program Files\Mozilla Firefox\firefox.exe"
            if os.path.exists(firefox_path):
                args["executable_path"] = firefox_path
        elif browser_name == "chromium":
            supermium_path = r"C:\Program Files\Supermium\chrome.exe"
            if os.path.exists(supermium_path):
                args["executable_path"] = supermium_path
                
    return args
