#!/usr/bin/env python3
"""
Root convenience entrypoint for database seeding.
Delegates to backend/seed_data.py.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from seed_data import seed_database

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Seed Delta University Faculty Exam Platform with Mock Data.")
    parser.add_argument("--no-reset", action="store_true", help="Do not purge existing data before seeding.")
    args = parser.parse_args()

    seed_database(force=not args.no_reset)
