"""
AnimaStudio — FastAPI 백엔드
==============================
AI 파이프라인 오케스트레이터

실행:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000

환경변수 (.env):
  GEMINI_API_KEY=...
  ELEVENLABS_API_KEY=...
  GOOGLE_CLOUD_PROJECT=...     # Veo 3 (Vertex AI)
  OUTPUT_DIR=./outputs          # 생성 파일 저장 경로
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# 라우터 임포트
from routers import scenario, character, storyboard, video, voice, export_router

load_dotenv()

# ── 출력 디렉토리 초기화 ───────────────────────
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/images", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/videos", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/audio", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/exports", exist_ok=True)

# ── FastAPI 앱 ────────────────────────────────
app = FastAPI(
    title="AnimaStudio API",
    description="AI 동물 홍보 영상 자동화 파이프라인",
    version="1.0.0",
)

# ── CORS (Next.js 개발 서버 허용) ─────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 정적 파일 (생성된 영상/이미지 서빙) ─────────
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

# ── 라우터 등록 ──────────────────────────────
app.include_router(scenario.router,        prefix="/scenario",   tags=["시나리오"])
app.include_router(character.router,       prefix="/character",  tags=["캐릭터"])
app.include_router(storyboard.router,      prefix="/storyboard", tags=["스토리보드"])
app.include_router(video.router,           prefix="/video",      tags=["영상 생성"])
app.include_router(voice.router,           prefix="/voice",      tags=["더빙 & 자막"])
app.include_router(export_router.router,   prefix="/export",     tags=["내보내기"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "AnimaStudio API v1.0"}
