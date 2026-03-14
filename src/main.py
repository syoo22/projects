import sys
from scraper import scrape_jobs
from notion_uploader import NotionUploader

def main():
    """Main orchestrator for job scraping and uploading."""
    print("=" * 60)
    print("Starting job scraper...")
    print("=" * 60)
    
    # Step 1: Scrape jobs from API
    print("\n[1/3] Fetching jobs from jasoseol.com API...")
    jobs = scrape_jobs()
    
    if not jobs:
        print("No jobs found. Exiting.")
        return
    
    # Step 2: Upload to Notion
    print(f"\n[2/3] Uploading to Notion ({len(jobs)} jobs)...")
    uploader = NotionUploader()
    stats = uploader.upload_jobs(jobs)
    
    # Step 3: Report results
    print("\n[3/3] Execution Summary:")
    print("=" * 60)
    print(f"Total jobs found:     {stats['total']}")
    print(f"New jobs added:       {stats['new']}")
    print(f"Duplicates skipped:   {stats['skipped']}")
    print(f"Errors:               {stats['errors']}")
    print("=" * 60)
    
    return stats

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
