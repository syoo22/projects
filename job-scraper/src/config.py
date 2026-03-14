import os
from dotenv import load_dotenv

load_dotenv()

# Notion API credentials
NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
DATABASE_ID = os.environ.get("NOTION_DATABASE_ID")

# Validate required environment variables
if not NOTION_TOKEN:
    raise ValueError("NOTION_TOKEN environment variable is not set")
if not DATABASE_ID:
    raise ValueError("NOTION_DATABASE_ID environment variable is not set")

# Keywords to filter jobs (empty list = collect all)
KEYWORDS = ["백엔드", "서버", "Python"]

# API request settings
REQUEST_DELAY = 1.0  # delay between requests (seconds)
MAX_PAGES = 10       # max pages to fetch
PER_PAGE = 20        # items per page
API_BASE_URL = "https://jasoseol.com/api/v1"
JOB_DETAIL_URL_TEMPLATE = "https://jasoseol.com/recruit/{id}"
