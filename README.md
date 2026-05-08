# 🎬 AnimaStudio — AI 동물 홍보 영상 자동화 플랫폼

사내 마케팅팀 전용 AI 영상 제작 내부툴

## 📐 전체 아키텍처

```
[Next.js 프론트엔드 :3000]
         ↓ /api/backend/* (rewrite)
[FastAPI 백엔드 :8000]
    ├── /scenario   → Gemini 2.0 Flash   (시나리오 생성)
    ├── /character  → Gemini Vision       (페르소나 분석)
    ├── /storyboard → Gemini + Imagen 3   (프레임 + 원화)
    ├── /video      → Google Veo 3        (영상 클립 생성)
    ├── /voice      → ElevenLabs TTS      (더빙 + 자막)
    └── /export     → FFmpeg              (최종 합성)
```

## 🛠 필요 환경

| 항목 | 버전 |
|------|------|
| Node.js | 18+ |
| Python | 3.11+ |
| FFmpeg | 6.0+ |
| pnpm / npm | 최신 |

## 🚀 빠른 시작

### 1. API 키 설정

```bash
cd animastudio
cp .env.example .env
# .env 파일에 API 키 입력:
#   GEMINI_API_KEY=...
#   ELEVENLABS_API_KEY=...
#   GOOGLE_CLOUD_PROJECT=...
```

### 2. 백엔드 실행

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 4. FFmpeg 설치 (자막/합성용)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# https://ffmpeg.org/download.html 에서 다운로드
```

---

## 📂 프로젝트 구조

```
animastudio/
├── .env.example              ← API 키 템플릿
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       ← 루트 레이아웃 (사이드바)
│   │   │   ├── scenario/        ← [Step 1] 시나리오 생성
│   │   │   ├── character/       ← [Step 2] 캐릭터 설정
│   │   │   ├── storyboard/      ← [Step 3] 스토리보드
│   │   │   ├── video/           ← [Step 4] 영상 생성
│   │   │   ├── voice/           ← [Step 5] 더빙 & 자막
│   │   │   └── export/          ← [Step 6] 내보내기
│   │   ├── components/
│   │   │   ├── ui/Sidebar.tsx       ← 사이드바 네비게이션
│   │   │   └── pipeline/PipelineHeader.tsx
│   │   ├── lib/
│   │   │   ├── store.ts         ← Zustand 전역 상태
│   │   │   └── api.ts           ← 백엔드 API 클라이언트
│   │   └── types/index.ts       ← TypeScript 타입 정의
└── backend/
    ├── main.py                  ← FastAPI 앱 진입점
    ├── requirements.txt
    └── routers/
        ├── scenario.py          ← Gemini 시나리오 생성
        ├── character.py         ← Gemini Vision 분석
        ├── storyboard.py        ← 스토리보드 + Imagen
        ├── video.py             ← Veo 3 영상 생성
        ├── voice.py             ← ElevenLabs TTS + SRT
        └── export_router.py     ← FFmpeg 최종 합성
```

---

## 🎯 캐릭터 페르소나 파괴 방지 전략

가장 중요한 기능입니다. 아래 3중 구조로 일관성을 보장합니다:

```
캐릭터 이미지 업로드
       ↓
Gemini Vision 분석
       ↓
lockedPrompt 생성    → 모든 Veo 프롬프트 앞에 강제 주입
negativePrompt 생성  → Veo negative_prompt에 주입
       ↓
Imagen 원화 생성     → 원화 기반 image-to-video 사용
       ↓
Veo 3 영상 생성      → 원화 참조 + 프롬프트 고정
```

---

## 🔑 API 키 획득 방법

### Gemini API (무료 시작 가능)
1. https://aistudio.google.com 접속
2. 구글 계정으로 로그인
3. "Get API Key" 클릭
4. 새 API 키 생성 → `.env`에 입력

### ElevenLabs (무료 플랜: 월 10,000자)
1. https://elevenlabs.io 접속
2. 회원가입 (무료)
3. 우측 상단 프로필 → "API Keys"
4. 새 키 생성 → `.env`에 입력

### Google Veo 3 / Imagen 3 (Vertex AI)
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성
3. "Vertex AI API" 활성화
4. Veo 3 Waitlist 신청 (승인 후 사용 가능)
5. 프로젝트 ID → `.env`에 입력
6. `gcloud auth application-default login` 실행

---

## ⚙️ API 키 없이 테스트 (Mock 모드)

API 키가 없어도 UI와 구조를 테스트할 수 있습니다.
- Gemini: Mock 시나리오 JSON 반환
- Veo 3: 생성 완료로 표시 (실제 영상 없음)
- ElevenLabs: 빈 오디오 파일 생성

프론트엔드 UI 전체 흐름은 API 키 없이도 확인 가능합니다.

---

## 🔧 다음 단계 (확장 포인트)

- [ ] 프로젝트 히스토리: SQLite → 제작 이력 저장
- [ ] 팀 협업: 프로젝트 공유 URL 생성
- [ ] 브랜드 에셋: 로고 오버레이 자동 삽입
- [ ] 템플릿: 캐릭터 + 시나리오 재사용 템플릿
- [ ] 배포: Docker Compose로 원클릭 사내 서버 배포
