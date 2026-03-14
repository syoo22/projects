# 자소설닷컴 채용공고 자동 스크래퍼

자소설닷컴의 채용공고를 매일 자동으로 수집하여 Notion 데이터베이스에 저장하는 자동화 파이프라인입니다.

## 기능

- ✅ 자소설닷컴 API를 통한 채용공고 자동 수집
- ✅ 키워드 필터링 (백엔드, 서버, Python 등)
- ✅ Notion 데이터베이스에 자동 저장
- ✅ 중복 공고 자동 감지
- ✅ GitHub Actions를 통한 일일 자동화 (KST 09:00)

## 기술 스택

- **언어**: Python 3.11
- **API 호출**: `requests`
- **Notion 연동**: `notion-client`
- **스케줄링**: GitHub Actions (cron)

## 로컬 설정

### 1. 환경 변수 설정

```bash
# .env 파일 생성
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id
```

### 2. 의존성 설치

```bash
pip install -r requirements.txt
```

### 3. 로컬 실행

```bash
python src/main.py
```

## Notion 데이터베이스 설정

### 1. Integration 생성
https://www.notion.so/my-integrations 에서 새 Integration 생성 → 토큰 복사

### 2. 데이터베이스 생성
Notion에서 다음 속성을 가진 데이터베이스 생성:

| 속성명 | 타입 | 필수 |
|--------|------|------|
| 공고 제목 | Title | ✓ |
| 회사명 | Rich Text | |
| 마감일 | Date | |
| 직무 태그 | Multi-select | |
| 링크 | URL | |
| 스크랩 날짜 | Date | |

### 3. Integration 연결
데이터베이스 페이지 → "연결(Connections)" → 생성한 Integration 추가

### 4. 데이터베이스 ID 추출
- DB 페이지 URL: `https://notion.so/workspace/DatabaseID?v=view...`
- 32자리 hex 문자열(하이픈 제외)이 Database ID

## GitHub Actions 설정

### 1. Repository Secrets 등록
Settings → Secrets and variables → Actions → New repository secret
- `NOTION_TOKEN`: Notion Integration 토큰
- `NOTION_DATABASE_ID`: 데이터베이스 ID

### 2. 워크플로우 활성화
- `.github/workflows/scraper.yml` 파일 커밋
- GitHub Actions 탭에서 "Job Scraper" 워크플로우 확인
- "workflow_dispatch" 버튼으로 수동 실행 가능

## 필터 키워드 설정

`src/config.py`의 `KEYWORDS` 수정:

```python
# 특정 직무만 수집
KEYWORDS = ["백엔드", "서버", "Python"]

# 모든 공고 수집
KEYWORDS = []
```

## 실행 결과 예시

```
============================================================
Starting job scraper...
============================================================

[1/3] Fetching jobs from jasoseol.com API...
Fetched page 1: 20 items
Fetched page 2: 20 items
Total jobs scraped: 40

[2/3] Uploading to Notion (40 jobs)...
Found 5 existing URLs in Notion DB
Created page for: 백엔드 개발자 모집
Skipping duplicate: 프론트엔드 개발자 (경력)
...

[3/3] Execution Summary:
============================================================
Total jobs found:     40
New jobs added:       35
Duplicates skipped:   5
Errors:               0
============================================================
```

## 주의사항

- ⚠️ `.env` 파일은 git에 커밋하지 마세요 (.gitignore에 포함됨)
- ⚠️ Notion Integration 토큰은 절대 공개하지 마세요
- ⚠️ API 요청 간격(`REQUEST_DELAY`)을 줄이지 마세요

## 문제 해결

### "NOTION_TOKEN environment variable is not set"
→ `.env` 파일이 올바르게 설정되었는지 확인

### Notion에 페이지가 추가되지 않음
→ Integration이 데이터베이스와 연결되었는지 확인
→ DATABASE_ID가 정확한지 확인 (하이픈 제외)

### 중복이 계속 추가됨
→ Notion DB의 "링크" 속성명이 정확한지 확인

## 개선 사항

향후 추가 가능한 기능:
- [ ] Slack 알림 통합
- [ ] 급여 정보 파싱
- [ ] 공고 자세히 보기 데이터 추가 수집
- [ ] 필터 규칙 유연화 (직급, 경력, 위치 등)
- [ ] 데이터베이스 백업 자동화
