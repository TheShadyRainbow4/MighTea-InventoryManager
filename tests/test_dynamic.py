import importlib.machinery
import importlib.util
import os
import sys

# Add tests directory to path so imports within tests work
sys.path.insert(0, os.path.dirname(__file__))

pyc_dir = os.path.join(os.path.dirname(__file__), "__pycache__")
for filename in os.listdir(pyc_dir):
    if filename.endswith(".pyc") and not filename.startswith("conftest"):
        # Extract the base test name
        name = filename.split(".")[0]
        if name in ["test_smoke", "test_dynamic"]:
            continue
        
        filepath = os.path.join(pyc_dir, filename)
        try:
            loader = importlib.machinery.SourcelessFileLoader(name, filepath)
            spec = importlib.util.spec_from_loader(name, loader)
            module = importlib.util.module_from_spec(spec)
            sys.modules[name] = module
            loader.exec_module(module)
            
            # Inject all test functions into this module's globals
            for key, val in module.__dict__.items():
                if key.startswith("test_"):
                    # We can keep the original name so pytest shows it nicely
                    globals()[key] = val
        except Exception as e:
            print(f"Failed to load {filename}: {e}", file=sys.stderr)
