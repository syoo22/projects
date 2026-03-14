# 자소설닷컴 채용공고 스크래퍼 - 아키텍처 & 원리

## 📊 전체 흐름도

```
매일 09:00 KST (GitHub Actions)
        ↓
  python src/main.py 실행
        ↓
   ┌────────────────────────┐
   │ 1. 기존 URL 확인        │  ← Notion에서 이미 저장된 공고 URL 목록 조회
   └────────────────────────┘
        ↓
   ┌────────────────────────┐
   │ 2. 공고 수집           │  ← 자소설닷컴 API에서 모든 공고 가져오기
   └────────────────────────┘
        ↓
   ┌────────────────────────┐
   │ 3. 필터링             │  ← 회사 규모, "신입" 키워드, 기간으로 필터
   └────────────────────────┘
        ↓
   ┌────────────────────────┐
   │ 4. 중복 체크           │  ← 이미 저장된 공고는 건너뛰기
   └────────────────────────┘
        ↓
   ┌────────────────────────┐
   │ 5. Notion에 저장       │  ← 새로운 공고만 추가
   └────────────────────────┘
```

---

## 🔧 파일별 역할

### **1️⃣ `src/config.py` - 설정**

```python
NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
DATABASE_ID = os.environ.get("NOTION_DATABASE_ID")
COMPANY_SIZES = ["대기업", "중견기업"]  # 수집할 회사 규모
REQUIRED_KEYWORD = "신입"               # 공고 제목에 포함되어야 함
CUTOFF_DATE = "2026-03-01"              # 수집 시작 날짜
```

**역할:**
- 환경변수 (.env 파일) 로드
- Notion API 인증 정보 관리
- 필터링 설정 (회사 규모, 신입 공고, 기간)
- API 기본 URL 설정
- 요청 타임아웃, 페이지 수 등 설정값 관리

---

### **2️⃣ `src/scraper.py` - 공고 수집 & 파싱**

**동작 흐름:**
```
자소설닷컴 API 호출
      ↓
https://jasoseol.com/api/v1/employment_companies?page=1&per_page=20
      ↓
JSON 응답 파싱:
  - id → 공고 ID
  - name → 회사명
  - company_size → 회사 규모
  - title → 공고 제목
  - start_time → 공고 시작일
  - end_time → 공고 마감일
  - created_at → 공고 등록일
      ↓
표준화된 딕셔너리로 변환
```

**핵심 메서드:**

| 메서드 | 역할 |
|--------|------|
| `scrape_jobs()` | 모든 페이지를 순회하며 공고 수집 & 필터링 (페이지네이션 처리) |
| `parse_date(date_str)` | ISO8601 날짜를 YYYY-MM-DD로 변환 |
| `is_target_company_size(company_size)` | 회사 규모가 대기업/중견기업인지 확인 |
| `has_required_keyword_in_title(title)` | 공고 제목에 "신입"이 포함되어 있는지 확인 |
| `is_after_cutoff_date(created_date)` | 공고가 2026-03-01 이후에 등록되었는지 확인 |
| `get_job_fields(job)` | 직무 배열에서 유니크한 필드만 추출 |

**출력 형식:**
```python
{
    "title": "2026년 상반기 신입사원 채용",
    "company_name": "삼성전자",
    "start_time": "2026-03-10",
    "end_time": "2026-03-17",
    "employments": [...],  # 직무 정보
    "url": "https://jasoseol.com/recruit/102920"
}
```

---

### **3️⃣ `src/notion_uploader.py` - Notion DB 관리**

**동작 원리:**

#### 1. `get_existing_urls()` - 기존 공고 조회
```
Notion DB 전체 쿼리
    ↓
각 페이지의 "링크" 속성 추출
    ↓
URL Set으로 변환 (빠른 조회)
    ↓
중복 방지용으로 사용
```

#### 2. `create_job_page(job)` - 새 공고 추가
```
공고 정보를 Notion 속성으로 매핑:

공고 제목      → Title (필수, 첫 번째 열)
회사명        → Rich Text
시작일        → Date
마감일        → Date
직무 태그      → Multi-select (배열)
링크          → URL
스크랩 날짜    → Date

Notion API 호출
    ↓
새 페이지 생성 완료
```

#### 3. `upload_jobs(jobs)` - 중복 체크 & 저장
```
for 각 공고:
  if 기존_URL에 있음:
    스킵 (중복)
  else:
    저장 (신규)

통계 반환:
{
  "collected": 200,  # 수집한 공고
  "saved": 8,        # 새로 저장한 공고
  "skipped": 7       # 건너뛴 공고 (중복)
}
```

---

### **4️⃣ `src/main.py` - 오케스트레이터**

프로젝트의 "지휘자" 역할. 모든 단계를 조율합니다.

**실행 순서:**
```python
1. 서비스 초기화
   scraper = JobScraper()
   uploader = NotionUploader()

2. 기존 URL 조회
   existing_urls = uploader.get_existing_urls()
   → Notion에 몇 개가 이미 있는지 확인

3. 공고 수집 & 필터링
   jobs = scraper.scrape_jobs()
   → 자소설닷컴에서 공고 수집
   → 회사 규모 (대기업/중견기업) 필터
   → 제목에 "신입" 포함 여부 확인
   → 2026-03-01 이후 등록 공고만 선별

4. Notion 저장
   stats = uploader.upload_jobs(jobs)
   → 중복 체크 후 신규 공고만 저장

5. 결과 출력
   print(f"Total jobs found: {stats['total']} jobs")
   print(f"New jobs added: {stats['new']} jobs")
   print(f"Duplicates skipped: {stats['skipped']} jobs")
```

---

### **5️⃣ `.github/workflows/scraper.yml` - 자동화**

**GitHub Actions 워크플로우:**

```yaml
on:
  schedule:
    - cron: '0 0 * * *'   # 매일 UTC 00:00 (KST 09:00)
  workflow_dispatch        # 수동 실행 버튼

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      1. 코드 체크아웃
      2. Python 3.11 설치
      3. 패키지 설치 (pip install -r requirements.txt)
      4. 스크래퍼 실행 (python src/main.py)
         환경변수: NOTION_TOKEN, NOTION_DATABASE_ID
      5. 실패 시 로그 업로드
```

---

## 🔄 동작 원리 (구체적 예시)

**시나리오: 2026년 3월 14일 아침 09:00**

```
[1단계] 기존 URL 확인
┌─────────────────────────────────────┐
│ Notion DB 조회                       │
│ 저장된 공고 URL:                     │
│  - jasoseol.com/recruit/102920      │
│  - jasoseol.com/recruit/102921      │
│  - jasoseol.com/recruit/102922      │
│ 총 45개                             │
└─────────────────────────────────────┘

[2단계] 공고 수집
┌─────────────────────────────────────┐
│ API 호출: page=1, per_page=20       │
│  → 20개 수집                        │
│ API 호출: page=2, per_page=20       │
│  → 20개 수집                        │
│ ...                                 │
│ API 호출: page=10, per_page=20      │
│  → 20개 수집                        │
│                                     │
│ 총 200개 수집                       │
└─────────────────────────────────────┘

[3단계] 필터링
┌─────────────────────────────────────┐
│ 조건 1: 회사 규모 = 대기업/중견기업 │
│ 조건 2: 제목에 "신입" 포함          │
│ 조건 3: 2026-03-01 이후 등록        │
│                                     │
│ 공고 1: "삼성 신입 개발자" ✅       │
│   → 대기업, "신입" 포함, 2026.3.5  │
│                                     │
│ 공고 2: "스타트업 경력직" ❌        │
│   → 중견기업이 아님, "신입" 없음   │
│                                     │
│ 공고 3: "LG 신입 채용" ✅           │
│   → 대기업, "신입" 포함, 2026.3.8  │
│                                     │
│ 필터링 후: 8개                      │
└─────────────────────────────────────┘

[4단계] 중복 체크
┌─────────────────────────────────────┐
│ 공고 A: URL = 102950                 │
│   → 기존 45개에 없음 ✅ 신규        │
│                                     │
│ 공고 B: URL = 102920                 │
│   → 기존 45개에 있음 ❌ 중복        │
│                                     │
│ 공고 C: URL = 102951                 │
│   → 기존 45개에 없음 ✅ 신규        │
│                                     │
│ 결과: 8개 신규, 7개 중복            │
└─────────────────────────────────────┘

[4단계] Notion 저장
┌─────────────────────────────────────┐
│ for 8개 신규 공고:                   │
│   Notion API 호출                    │
│   → 새 페이지 생성                   │
│   → 데이터 입력:                     │
│     - 공고 제목                      │
│     - 회사명                         │
│     - 시작일                         │
│     - 마감일                         │
│     - 직무 태그                      │
│     - 링크                           │
│     - 스크랩 날짜                    │
│                                     │
│ ✅ 저장 완료!                        │
└─────────────────────────────────────┘

[결과 출력]
==================================================
SCRAPING COMPLETE
==================================================
Total jobs found:     40 jobs
New jobs added:       8 jobs
Duplicates skipped:   7 jobs
==================================================
```

---

## 🎯 설계 원칙

| 원칙 | 이유 |
|------|------|
| **Selenium 안 씀** | 자소설닷컴이 공식 REST API 제공 → requests만으로 충분, 빠름 |
| **URL 기반 중복 체크** | Notion DB가 source of truth → 가장 정확하고 신뢰할 수 있음 |
| **다층 필터링** | 회사 규모, "신입" 키워드, 등록 기간 → 관심 공고만 수집 |
| **GitHub Actions 자동화** | 매일 자동 실행 → 수동 작업 없음 |
| **상세 로그** | 수집/저장/스킵 개수 출력 → 정상 작동 확인 가능 |
| **단일 책임 원칙** | 각 모듈이 한 가지만 담당 → 유지보수 용이 |

---

## 📈 확장 가능성

### 다른 채용공고 사이트 추가
```python
# scraper.py에 새로운 클래스 추가
class JobKoreaScraper(JobScraper):
    def __init__(self):
        self.base_url = "https://job.korea.com/api/..."

class DreamJobScraper(JobScraper):
    def __init__(self):
        self.base_url = "https://dreamjob.com/api/..."

# main.py에서 여러 스크래퍼 병렬 실행
scrapers = [JobScraper(), JobKoreaScraper(), DreamJobScraper()]
for scraper in scrapers:
    jobs.extend(scraper.fetch_all_jobs())
```

### 알림 기능 추가
```python
# Slack, Discord, Email로 새로운 공고 알림
from notifiers import get_notifier

slack = get_notifier('slack')
for job in new_jobs:
    slack.notify(message=f"새 공고: {job['title']} - {job['company']}")
```

### 공고 분석 기능 추가
```python
# 채용공고 통계 분석
- 가장 자주 채용되는 직무
- 평균 마감일까지 남은 일수
- 회사별 채용 공고 수
```

---

## 🔐 보안 고려사항

1. **환경변수 관리**
   - `.env` 파일은 `.gitignore`에 포함 (절대 커밋 금지)
   - GitHub Secrets에 토큰 저장 (코드와 분리)

2. **API 인증**
   - Notion Integration 토큰은 secrets로 관리
   - 토큰 탈취 시 GitHub에서 재생성 가능

3. **Rate Limiting**
   - 요청 간 1초 지연 (REQUEST_DELAY)
   - 자소설닷컴의 서버 부담 최소화

---

## ⚙️ 문제 해결

### API 응답 구조 변경
자소설닷컴의 API 응답이 변경되면 `scraper.py`의 `_fetch_page()` 메서드 수정 필요.

현재 처리:
- 응답이 리스트면 직접 반환
- 응답이 딕셔너리면 "data" 키에서 추출

### Notion 연동 실패
- NOTION_TOKEN 유효성 확인
- DATABASE_ID 정확성 확인
- Integration이 데이터베이스와 공유되었는지 확인

### 공고가 추가되지 않음
- COMPANY_SIZES 설정 확인 (대기업, 중견기업이 맞는지)
- REQUIRED_KEYWORD = "신입" 확인 (제목에 포함되어야 함)
- CUTOFF_DATE 설정 확인 (현재 날짜보다 과거인지)
- 자소설닷컴 사이트에서 해당 조건의 공고 존재하는지 확인
- GitHub Actions 로그에서 에러 메시지 확인

---

## 📚 참고 자료

- [Notion API 문서](https://developers.notion.com/)
- [requests 라이브러리](https://requests.readthedocs.io/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Python datetime](https://docs.python.org/3/library/datetime.html)
