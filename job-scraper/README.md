# 채용공고 자동 스크래퍼 (Job Scraper)

## 📋 프로젝트 개요

**jasoseol.com**의 채용공고를 자동으로 스크래핑하여 **Notion 데이터베이스**에 저장하고, 완료 후 **이메일 알림**을 받는 자동화 시스템입니다.

---

## ✨ 주요 기능

### 1️⃣ 자동 스크래핑
- jasoseol.com API에서 채용공고 수집
- **필터링**: "신입" 키워드 + 2026-03-01 이후 공고만 수집
- API 요청 간 지연 설정으로 서버 부하 최소화

### 2️⃣ Notion 자동 저장
- 새로운 공고를 Notion 데이터베이스에 자동 저장
- **필드 정보**:
  - 공고 제목
  - 회사명
  - 공고 시작일 (start_time)
  - 마감일 (end_time)
  - 직무 태그 (multi_select)
  - 공고 링크 (url)
  - **스크랩 날짜** (한국 시간 포함)
- 중복 공고 자동 제외

### 3️⃣ 이메일 알림
- 스크래핑 완료 후 Gmail로 자동 알림
- 결과 통계 포함 (전체/새로운/중복/오류 개수)

### 4️⃣ GitHub Secrets 통합
- Notion API 키, Database ID, 이메일 설정을 GitHub Secrets에 안전하게 저장
- 로컬에서 `.env` 파일 없이 `gh` CLI로 자동 로드 가능

---

## 🛠️ 기술 스택

- **언어**: Python 3.14+
- **라이브러리**:
  - `requests` - API 호출
  - `notion-client` - Notion 통합
  - `python-dotenv` - 환경변수 로드
- **배포**: GitHub Actions (자동 스케줄링 가능)

---

## 📦 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/syoo22/projects.git
cd projects/job-scraper
```

### 2. 의존성 설치
```bash
pip install -r requirements.txt
```

### 3. 환경 설정 (2가지 방법)

**방법 A: GitHub Secrets 사용 (추천)**
```bash
gh auth login  # GitHub 로그인 (첫 1회)
gh secret set NOTION_TOKEN --body "your-notion-api-key"
gh secret set NOTION_DATABASE_ID --body "your-database-id"
gh secret set EMAIL_SENDER --body "your-gmail@gmail.com"
gh secret set EMAIL_PASSWORD --body "your-app-password"
gh secret set EMAIL_RECIPIENT --body "recipient@gmail.com"
```

**방법 B: .env 파일**
```
NOTION_TOKEN=your-notion-api-key
NOTION_DATABASE_ID=your-database-id
EMAIL_SENDER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_RECIPIENT=recipient@gmail.com
```

### 4. 실행
```bash
python src/main.py
```

---

## 📊 실행 결과 예시

```
============================================================
Starting job scraper...
============================================================

[1/3] Fetching jobs from jasoseol.com API...
Found 45 jobs with "신입" keyword

[2/3] Uploading to Notion (45 jobs)...
Created page for: [신입] 백엔드 개발자 모집
Skipping duplicate: [신입] 프론트엔드 개발자...
...

[3/3] Execution Summary:
============================================================
Total jobs found:     45
New jobs added:       12
Duplicates skipped:   33
Errors:               0
============================================================

✅ 이메일 알림 전송 완료
```

---

## ⚙️ 필터링 로직

| 필터 | 상태 | 설명 |
|------|------|------|
| "신입" 키워드 | ✅ 활성화 | 공고 제목에 "신입" 포함 필수 |
| 날짜 필터 | ✅ 활성화 | 2026-03-01 이후 공고만 수집 |

---

## 🔧 환경변수 상세

| 변수 | 설명 | 예시 |
|------|------|------|
| `NOTION_TOKEN` | Notion Integration API 토큰 | `secret_abc123...` |
| `NOTION_DATABASE_ID` | Notion 데이터베이스 ID | `abc123def456...` |
| `EMAIL_SENDER` | 발신 Gmail 주소 | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | Gmail 앱 비밀번호 | `xyzabc...` (16자) |
| `EMAIL_RECIPIENT` | 수신자 이메일 | `your-email@gmail.com` |

---

## 🚀 자동화 (GitHub Actions)

`.github/workflows/scraper.yml`을 설정하면 매일 정해진 시간에 자동 실행 가능합니다.

```yaml
schedule:
  - cron: '0 9 * * *'  # 매일 아침 9시 실행
```

---

## 📧 Gmail 앱 비밀번호 생성

1. [Google 계정](https://myaccount.google.com/) → 보안
2. 2단계 인증 활성화
3. "앱 비밀번호" → Gmail 선택
4. 생성된 16자 비밀번호 복사

---

## 🛡️ 보안 주의사항

- **`.env` 파일은 git에 커밋하지 않기** (.gitignore에 포함됨)
- **GitHub Secrets 사용** 권장 (민감한 정보 보호)
- API 키와 비밀번호는 절대 코드에 하드코딩하지 않기

---

## 📞 문제 해결

### Notion 데이터베이스가 없는 경우
```bash
python src/create_notion_db.py
```

### 이메일이 발송되지 않는 경우
- Gmail 앱 비밀번호 정확성 확인
- 환경변수가 올바르게 설정되었는지 확인
- 덜 안전한 앱 사용 활성화 필요할 수도 있음

### API 요청 오류
- jasoseol.com 서버 상태 확인
- 요청 지연 시간 증가 (config.py의 REQUEST_DELAY)

---

## 📄 파일 구조

```
 ┌─────────────────────┬────────────────────────────────────┬──────┐
  │        파일         │                역할                │ 필수 │
  ├─────────────────────┼────────────────────────────────────┼──────┤
  │ main.py             │ 전체 프로세스 조율                 │ ✅   │
  ├─────────────────────┼────────────────────────────────────┼──────┤
  │ config.py           │ API URL, 필터, 토큰 설정           │ ✅   │
  ├─────────────────────┼────────────────────────────────────┼──────┤
  │ scraper.py          │ jasoseol.com API에서 채용공고 수집 │ ✅   │
  ├─────────────────────┼────────────────────────────────────┼──────┤
  │ notion_uploader.py  │ Notion DB에 데이터 저장            │ ✅   │
  ├─────────────────────┼────────────────────────────────────┼──────┤
  │ requirements.txt    │ 필요한 라이브러리                  │ ✅   │
  ├─────────────────────┼────────────────────────────────────┼──────┤
  │ .env                │ 환경변수 저장                      │ ✅   │
  └─────────────────────┴────────────────────────────────────┴──────┘
```
  실행 명령어

  # 1. 패키지 설치
  pip install -r requirements.txt

  # 2. 프로세스 실행
  python src/main.py
---

**마지막 업데이트**: 2026-03-14
