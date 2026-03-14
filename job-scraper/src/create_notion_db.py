#!/usr/bin/env python3
"""
Create a Notion database with the correct schema for job listings
"""

from notion_client import Client
from config import NOTION_TOKEN

def create_database():
    """Create a new Notion database with job listing schema"""
    client = Client(auth=NOTION_TOKEN)

    try:
        # Create database in user's workspace
        # Using "Unnamed" as parent - this creates it at workspace root
        database = client.databases.create(
            parent={
                "type": "workspace",
                "workspace": True
            },
            title=[
                {
                    "type": "text",
                    "text": {
                        "content": "채용공고 자동 스크래퍼"
                    }
                }
            ],
            properties={
                "공고 제목": {
                    "title": {}
                },
                "회사명": {
                    "rich_text": {}
                },
                "시작일": {
                    "date": {}
                },
                "마감일": {
                    "date": {}
                },
                "직무 태그": {
                    "multi_select": {
                        "options": []
                    }
                },
                "링크": {
                    "url": {}
                },
                "스크랩 날짜": {
                    "date": {}
                }
            }
        )

        database_id = database["id"]
        # Format: remove hyphens from UUID
        formatted_id = database_id.replace("-", "")

        print("\n" + "="*60)
        print("✅ Notion 데이터베이스 생성 완료!")
        print("="*60)
        print(f"\n Database ID (하이픈 제거): {formatted_id}")
        print(f" Database ID (원본): {database_id}")
        print("\n📝 .env 파일을 다음과 같이 수정하세요:")
        print(f" NOTION_DATABASE_ID={formatted_id}")
        print("\n🔗 Database URL:")
        print(f" https://notion.so/{database_id}")
        print("="*60 + "\n")

        return database_id

    except Exception as e:
        print(f"\n❌ 에러: {e}")
        print("\n💡 문제 해결:")
        print("1. NOTION_TOKEN이 올바른지 확인")
        print("2. Integration이 workspace에 권한이 있는지 확인")
        print("3. 수동으로 Notion에서 데이터베이스를 생성하고")
        print("   DATABASE_ID를 .env에 입력하세요")
        return None


if __name__ == "__main__":
    create_database()
