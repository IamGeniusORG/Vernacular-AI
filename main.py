import sys
import os

# Add the 'backend' folder to sys.path so 'app' and all submodules resolve smoothly
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backend.main import app
