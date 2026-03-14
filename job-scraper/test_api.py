#!/usr/bin/env python3
"""Test script to check API response structure"""

import sys
sys.path.insert(0, 'src')

from scraper import JobScraper
import json

scraper = JobScraper()
jobs = scraper.fetch_all_jobs()

if jobs:
    print("=" * 60)
    print("recruit_type 값들 확인 (채용형태)")
    print("=" * 60)
    recruit_types = {}
    for i, job in enumerate(jobs[:20]):  # 처음 20개만
        recruit_type = job.get("recruit_type")
        title = job.get("title", "")[:30]
        if recruit_type not in recruit_types:
            recruit_types[recruit_type] = []
        recruit_types[recruit_type].append(title)

    for rtype, titles in sorted(recruit_types.items()):
        print(f"\nrecruit_type = {rtype}")
        for title in titles[:3]:  # 각 타입마다 3개 공고만
            print(f"  - {title}")

else:
    print("공고를 가져올 수 없습니다.")
