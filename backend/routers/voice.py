"""
더빙 & 자막 라우터 — ElevenLabs TTS
=====================================
1. 대사 텍스트 → ElevenLabs API → MP3 오디오
2. 오디오 길이 측정 → SRT 자막 타임코드 자동 생성
3. 생성된 오디오는 /outputs/audio/ 에 저장
"""
import os
import uuid
import asyncio
import aiohttp
import aiofiles
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

OUTPUT_DIR    = os.getenv("OUTPUT_DIR", "./outputs")
ELEVEN_API    = "https://api.elevenlabs.io/v1"
ELEVEN_KEY    = os.getenv("ELEVENLABS_API_KEY", "")

# ElevenLabs 기본 Voice ID 매핑
VOICE_IDS = {
    "warm-female":   "EXAVITQu4vr4xnSDxMaL",   # Bella
    "bright-female": "21m00Tcm4TlvDq8ikWAM",   # Rachel
    "warm-male":     "ErXwobaYiN019PkySvjV",   # Antoni
    "bright-male":   "VR6AewLTigWG4xSOukaG",   # Arnold
}


# ── 모델 ─────────────────────────────────────
class DialogueItem(BaseModel):
    sceneNumber: int
    text: str


class VoiceSettings(BaseModel):
    engine: str = "elevenlabs"
    voiceId: str = "warm-female"
    voiceLabel: str = "따뜻한 여성"
    speed: float = 1.0
    emotion: str = "neutral"
    subtitleStyle: str = "white-outline"
    subtitlePosition: str = "bottom"


class VoiceTrack(BaseModel):
    trackId: str
    sceneNumber: int
    dialogue: str
    audioUrl: Optional[str] = None
    durationSeconds: Optional[float] = None
    status: str = "idle"


class GenerateRequest(BaseModel):
    projectId: str
    dialogues: list[DialogueItem]
    settings: VoiceSettings


class SubtitleEntry(BaseModel):
    index: int
    startTime: str    # "00:00:01,000"
    endTime: str      # "00:00:04,200"
    text: str


class SubtitleRequest(BaseModel):
    tracks: list[VoiceTrack]


# ── 유틸: 초 → SRT 타임코드 ──────────────────
def seconds_to_srt_time(seconds: float) -> str:
    h  = int(seconds // 3600)
    m  = int((seconds % 3600) // 60)
    s  = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# ── ElevenLabs API 호출 ───────────────────────
async def generate_tts(text: str, voice_id: str, speed: float) -> bytes:
    """ElevenLabs Text-to-Speech API"""
    headers = {
        "xi-api-key":   ELEVEN_KEY,
        "Content-Type": "application/json",
        "Accept":       "audio/mpeg",
    }
    payload = {
        "text":           text,
        "model_id":       "eleven_multilingual_v2",   # 한국어 지원
        "voice_settings": {
            "stability":        0.5,
            "similarity_boost": 0.75,
            "speed":            speed,
        },
    }
    url = f"{ELEVEN_API}/text-to-speech/{voice_id}"

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, headers=headers) as resp:
            if resp.status != 200:
                body = await resp.text()
                raise Exception(f"ElevenLabs API 오류 ({resp.status}): {body}")
            return await resp.read()


# ── MP3 길이 측정 ────────────────────────────
def get_audio_duration(mp3_bytes: bytes) -> float:
    """
    간단한 MP3 비트레이트 기반 추정
    (정확한 측정은 ffprobe 사용 권장)
    """
    try:
        import struct
        # 128kbps 기준 추정 (ElevenLabs 기본값)
        return len(mp3_bytes) / (128 * 1024 / 8)
    except:
        return 3.0   # 기본 3초


# ── Mock TTS (API 키 없을 때) ─────────────────
async def mock_tts(text: str) -> bytes:
    await asyncio.sleep(0.5)
    # 빈 MP3 헤더 (실제 오디오 없음 — 테스트용)
    return b'\xff\xfb\x90\x00' * 100


# ── 엔드포인트: 더빙 생성 ─────────────────────
@router.post("/generate", response_model=dict)
async def generate_voice_tracks(req: GenerateRequest):
    """
    대사별 TTS 오디오 생성

    POST /voice/generate
    """
    if not ELEVEN_KEY:
        print("⚠️  ELEVENLABS_API_KEY 미설정 — Mock 모드로 실행합니다")

    voice_id = VOICE_IDS.get(req.settings.voiceId, VOICE_IDS["warm-female"])
    tracks: list[VoiceTrack] = []

    for item in req.dialogues:
        track_id = f"track_{item.sceneNumber}_{uuid.uuid4().hex[:6]}"

        try:
            # TTS 생성
            if ELEVEN_KEY:
                audio_bytes = await generate_tts(item.text, voice_id, req.settings.speed)
            else:
                audio_bytes = await mock_tts(item.text)

            # 파일 저장
            audio_path = f"{OUTPUT_DIR}/audio/{track_id}.mp3"
            async with aiofiles.open(audio_path, "wb") as f:
                await f.write(audio_bytes)

            duration = get_audio_duration(audio_bytes)

            tracks.append(VoiceTrack(
                trackId         = track_id,
                sceneNumber     = item.sceneNumber,
                dialogue        = item.text,
                audioUrl        = f"/outputs/audio/{track_id}.mp3",
                durationSeconds = round(duration, 2),
                status          = "done",
            ))

        except Exception as e:
            tracks.append(VoiceTrack(
                trackId     = track_id,
                sceneNumber = item.sceneNumber,
                dialogue    = item.text,
                status      = "error",
            ))
            print(f"TTS 오류 [장면 {item.sceneNumber}]: {e}")

    return {"success": True, "data": [t.model_dump() for t in tracks]}


# ── 엔드포인트: 자막 생성 ─────────────────────
@router.post("/subtitles", response_model=dict)
async def generate_subtitles(req: SubtitleRequest):
    """
    오디오 트랙 타임스탬프 기반 SRT 자막 자동 생성

    POST /voice/subtitles
    """
    subtitles: list[SubtitleEntry] = []
    current_time = 0.0    # 자막 시작 시간 추적

    for i, track in enumerate(req.tracks):
        if track.status != "done" or not track.dialogue:
            continue

        duration = track.durationSeconds or 3.0
        padding  = 0.3   # 자막 앞뒤 여유 시간(초)

        start = current_time + padding
        end   = start + duration

        subtitles.append(SubtitleEntry(
            index     = i + 1,
            startTime = seconds_to_srt_time(start),
            endTime   = seconds_to_srt_time(end),
            text      = track.dialogue,
        ))

        # 영상 클립 길이(8초) 단위로 시간 진행
        current_time += 8.0

    return {"success": True, "data": [s.model_dump() for s in subtitles]}
