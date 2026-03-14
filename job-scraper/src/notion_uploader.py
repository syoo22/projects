from notion_client import Client
from typing import List, Dict, Any, Set
from datetime import datetime
from zoneinfo import ZoneInfo
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import NOTION_TOKEN, DATABASE_ID, SMTP_SERVER, SMTP_PORT, EMAIL_SENDER, EMAIL_PASSWORD, EMAIL_RECIPIENT
from scraper import get_job_fields

class NotionUploader:
    def __init__(self):
        self.client = Client(auth=NOTION_TOKEN)
        self.database_id = DATABASE_ID
    
    def get_existing_urls(self) -> Set[str]:
        """Query Notion DB and return set of existing job URLs."""
        urls = set()
        has_more = True
        start_cursor = None
        
        try:
            while has_more:
                query_params = {
                    "database_id": self.database_id,
                    "page_size": 100
                }
                if start_cursor:
                    query_params["start_cursor"] = start_cursor
                
                response = self.client.databases.query(**query_params)
                
                for page in response.get('results', []):
                    properties = page.get('properties', {})
                    link_prop = properties.get('링크', {})
                    
                    # Handle URL property
                    if link_prop.get('type') == 'url':
                        url = link_prop.get('url')
                        if url:
                            urls.add(url)
                
                has_more = response.get('has_more', False)
                start_cursor = response.get('next_cursor')
            
            print(f"Found {len(urls)} existing URLs in Notion DB")
            return urls
            
        except Exception as e:
            print(f"Error querying Notion DB: {e}")
            return set()
    
    def create_job_page(self, job: Dict[str, Any]) -> bool:
        """Create a new job page in Notion DB."""
        try:
            properties = {
                "공고 제목": {
                    "title": [
                        {
                            "text": {
                                "content": job['title'][:200]  # Notion title limit
                            }
                        }
                    ]
                },
                "회사명": {
                    "rich_text": [
                        {
                            "text": {
                                "content": job['company_name']
                            }
                        }
                    ]
                },
                "공고 시작일": {
                    "date": {
                        "start": job['start_time'] if job['start_time'] else None
                    }
                } if job['start_time'] else {},
                "마감일": {
                    "date": {
                        "start": job['end_time'] if job['end_time'] else None
                    }
                } if job['end_time'] else {},
                "직무 태그": {
                    "multi_select": [
                        {"name": field} for field in get_job_fields(job)
                    ]
                },
                "링크": {
                    "url": job['url']
                },
                "스크랩 날짜": {
                    "date": {
                        "start": datetime.now(ZoneInfo("Asia/Seoul")).strftime('%Y-%m-%dT%H:%M:%S'),
                        "time_zone": "Asia/Seoul"
                    }
                }
            }
            
            # Remove empty date properties
            if not properties.get("공고 시작일"):
                del properties["공고 시작일"]
            if not properties.get("마감일"):
                del properties["마감일"]
            
            page = self.client.pages.create(
                parent={"database_id": self.database_id},
                properties=properties
            )
            
            print(f"Created page for: {job['title']}")
            return True
            
        except Exception as e:
            print(f"Error creating page for {job['title']}: {e}")
            return False
    
    def send_completion_email(self, stats: Dict[str, int]) -> bool:
        """Send email notification with scraping results."""
        if not all([EMAIL_SENDER, EMAIL_PASSWORD, EMAIL_RECIPIENT]):
            print("⚠️ Email settings not configured, skipping notification")
            return False

        try:
            # Create email
            msg = MIMEMultipart()
            msg['From'] = EMAIL_SENDER
            msg['To'] = EMAIL_RECIPIENT
            msg['Subject'] = f"[채용공고 스크래퍼] 스크랩 완료 ✅"

            # Email body
            body = f"""
스크랩이 완료되었습니다!

📊 결과:
- 전체 공고: {stats['total']}개
- 새로운 공고: {stats['new']}개 ✨
- 중복 제외: {stats['skipped']}개
- 오류: {stats['errors']}개

⏰ 완료 시간: {datetime.now(ZoneInfo("Asia/Seoul")).strftime('%Y-%m-%d %H:%M:%S')}

Notion 데이터베이스를 확인하세요!
"""

            msg.attach(MIMEText(body, 'plain', 'utf-8'))

            # Send email
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(EMAIL_SENDER, EMAIL_PASSWORD)
                server.send_message(msg)

            print("✅ 이메일 알림 전송 완료")
            return True

        except Exception as e:
            print(f"❌ 이메일 전송 실패: {e}")
            return False

    def upload_jobs(self, jobs: List[Dict[str, Any]]) -> Dict[str, int]:
        """Upload new jobs to Notion, skipping duplicates."""
        existing_urls = self.get_existing_urls()

        stats = {
            'total': len(jobs),
            'new': 0,
            'skipped': 0,
            'errors': 0
        }

        for job in jobs:
            if job['url'] in existing_urls:
                stats['skipped'] += 1
                print(f"Skipping duplicate: {job['title']}")
            else:
                if self.create_job_page(job):
                    stats['new'] += 1
                else:
                    stats['errors'] += 1

        # Send completion email
        self.send_completion_email(stats)

        return stats
