import requests
import time
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
from config import API_BASE_URL, PER_PAGE, REQUEST_DELAY, MAX_PAGES, REQUIRED_KEYWORD, CUTOFF_DATE, JOB_DETAIL_URL_TEMPLATE

def parse_date(date_string: str) -> str:
    """Parse ISO8601 date string and return YYYY-MM-DDTHH:MM:SS format (KST)."""
    if not date_string:
        return None
    try:
        dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        kst = dt.astimezone(timezone(timedelta(hours=9)))
        return kst.strftime('%Y-%m-%dT%H:%M:%S')
    except Exception as e:
        print(f"Error parsing date {date_string}: {e}")
        return None

def has_required_keyword_in_title(title: str) -> bool:
    """Check if job title contains '신입' keyword."""
    if not title:
        return False
    return REQUIRED_KEYWORD in title

def is_after_cutoff_date(created_date: str) -> bool:
    """Check if job was posted on or after cutoff date."""
    if not created_date:
        return False
    try:
        job_date = datetime.fromisoformat(created_date.replace('Z', '+00:00')).strftime('%Y-%m-%d')
        return job_date >= CUTOFF_DATE
    except Exception:
        return False

def scrape_jobs() -> List[Dict[str, Any]]:
    """
    Fetch job postings from jasoseol.com API.
    Returns list of job dictionaries.
    """
    jobs = []
    
    for page in range(1, MAX_PAGES + 1):
        try:
            url = f"{API_BASE_URL}/employment_companies"
            params = {
                "page": page,
                "per_page": PER_PAGE
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            companies = data if isinstance(data, list) else data.get('data', [])
            
            if not companies:
                print(f"No more data at page {page}")
                break
            
            for company in companies:
                title = company.get('title', '')
                created_date = company.get('created_at', '')

                # Apply filters
                if not has_required_keyword_in_title(title):
                    continue
                if not is_after_cutoff_date(created_date):
                    continue

                # Extract relevant fields
                job = {
                    'id': company.get('id'),
                    'title': title,
                    'company_name': company.get('name'),
                    'start_time': parse_date(company.get('start_time')),
                    'end_time': parse_date(company.get('end_time')),
                    'employments': company.get('employments', []),
                    'url': JOB_DETAIL_URL_TEMPLATE.format(id=company.get('id'))
                }

                jobs.append(job)
            
            print(f"Fetched page {page}: {len(companies)} items")
            time.sleep(REQUEST_DELAY)
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching page {page}: {e}")
            break
    
    print(f"Total jobs scraped: {len(jobs)}")
    return jobs

def get_job_fields(job: Dict[str, Any]) -> List[str]:
    """Extract and deduplicate job field tags."""
    fields = set()
    for emp in job.get('employments', []):
        field = emp.get('field', '').strip()
        if field:
            fields.add(field)
    return sorted(list(fields))
