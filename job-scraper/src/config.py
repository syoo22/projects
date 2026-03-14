import os
import subprocess
from dotenv import load_dotenv

load_dotenv()

def get_github_secret(secret_name):
    """Fetch GitHub secret using GitHub CLI (gh)."""
    try:
        result = subprocess.run(
            ["gh", "secret", "view", secret_name, "--repo", "syoo22/job-scraper"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None

# Notion API credentials
# Priority: GitHub Secrets (via gh CLI) → Environment variables → .env file
NOTION_TOKEN = os.environ.get("NOTION_TOKEN") or get_github_secret("NOTION_TOKEN")
DATABASE_ID = os.environ.get("NOTION_DATABASE_ID") or get_github_secret("NOTION_DATABASE_ID")

# Validate required environment variables
if not NOTION_TOKEN:
    raise ValueError("NOTION_TOKEN not found (check GitHub Secrets or .env file)")
if not DATABASE_ID:
    raise ValueError("NOTION_DATABASE_ID not found (check GitHub Secrets or .env file)")

# Company size to filter jobs
COMPANY_SIZES = ["대기업", "중견기업"]

# Required keyword in job title
REQUIRED_KEYWORD = "신입"

# Cutoff date for job postings
CUTOFF_DATE = "2026-03-01"

# API request settings
REQUEST_DELAY = 1.0  # delay between requests (seconds)
MAX_PAGES = 10       # max pages to fetch
PER_PAGE = 20        # items per page
API_BASE_URL = "https://jasoseol.com/api/v1"
JOB_DETAIL_URL_TEMPLATE = "https://jasoseol.com/recruit/{id}"

# Email notification settings
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_SENDER = os.environ.get("EMAIL_SENDER")  # Your Gmail address
EMAIL_PASSWORD = os.environ.get("EMAIL_PASSWORD")  # Gmail app password
EMAIL_RECIPIENT = os.environ.get("EMAIL_RECIPIENT")  # Recipient email (can be same as sender)
