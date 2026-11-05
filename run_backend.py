import os
import sys
from pathlib import Path
import uvicorn

# Resolve root and backend directory paths
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend" if (ROOT_DIR / "backend").exists() else ROOT_DIR

# Add backend directory to sys.path and switch working directory
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(str(BACKEND_DIR))

if __name__ == "__main__":
    print(f"[*] Starting Faculty Exam Scheduler Backend from {BACKEND_DIR}...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
