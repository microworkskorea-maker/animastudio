"""
영상 생성 라우터 — Kling AI 공식 API
"""
import os
import uuid
import time
import hmac
import hashlib
import base64
import asyncio
import aiohttp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs")

KLING_ACCESS_KEY = os.getenv("KLING_ACCESS_KEY", "")
KLING_SECRET_KEY = os.getenv("KLING_SECRET_KEY", "")
KLING_API_BASE   = "https://api.klingai.com"


class StoryboardFrame(BaseModel):
    frameId: str
    sceneNumber: int
    cutNumber: int
    description: str
    imageUrl: Optional[str] = None
    compositionNote: str = ""


class CharacterConfig(BaseModel):
    lockedPrompt: str
    negativePrompt: str
    name: str = ""


class VideoSettings(BaseModel):
    resolution: str = "1080p"
    fps: int = 24
    transition: str = "fade"
    bgMusic: Optional[str] = None


class VideoClip(BaseModel):
    clipId: str
    sceneNumber: int
    videoUrl: Optional[str] = None
    durationSeconds: int = 5
    status: str = "generating"
    veoPrompt: str = ""


class StartRequest(BaseModel):
    projectId: str
    frames: list[StoryboardFrame]
    character: CharacterConfig
    settings: VideoSettings


_jobs: dict = {}


def make_jwt_token():
    """Kling API JWT 토큰 생성"""
    import json
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).rstrip(b'=').decode()
    now = int(time.time())
    payload = base64.urlsafe_b64encode(json.dumps({
        "iss": KLING_ACCESS_KEY,
        "exp": now + 1800,
        "nbf": now - 5
    }).encode()).rstrip(b'=').decode()
    msg = f"{header}.{payload}"
    sig = base64.urlsafe_b64encode(
        hmac.new(KLING_SECRET_KEY.encode(), msg.encode(), hashlib.sha256).digest()
    ).rstrip(b'=').decode()
    return f"{msg}.{sig}"


def build_prompt(frame, character):
    return f"{character.lockedPrompt}, {frame.description}, {frame.compositionNote}, cartoon mascot style, brand advertisement, smooth motion, 1080p quality"


async def generate_one_clip(clip, frame, character):
    """Kling API로 단일 클립 생성"""
    if not KLING_ACCESS_KEY or not KLING_SECRET_KEY:
        await asyncio.sleep(2)
        clip.videoUrl = None
        clip.status = "done"
        return

    token = make_jwt_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "model_name": "kling-v1",
        "prompt": build_prompt(frame, character),
        "negative_prompt": character.negativePrompt,
        "cfg_scale": 0.5,
        "mode": "std",
        "duration": "5",
        "aspect_ratio": "16:9",
    }

    try:
        async with aiohttp.ClientSession() as session:
            # 영상 생성 요청
            async with session.post(
                f"{KLING_API_BASE}/v1/videos/text2video",
                json=payload,
                headers=headers
            ) as resp:
                data = await resp.json()
                task_id = data.get("data", {}).get("task_id")
                if not task_id:
                    clip.status = "error"
                    return

            # 완료될 때까지 폴링 (최대 5분)
            for _ in range(60):
                await asyncio.sleep(5)
                async with session.get(
                    f"{KLING_API_BASE}/v1/videos/text2video/{task_id}",
                    headers=headers
                ) as poll:
                    poll_data = await poll.json()
                    task_status = poll_data.get("data", {}).get("task_status")
                    if task_status == "succeed":
                        works = poll_data.get("data", {}).get("task_result", {}).get("videos", [])
                        if works:
                            clip.videoUrl = works[0].get("url")
                        clip.status = "done"
                        return
                    elif task_status == "failed":
                        clip.status = "error"
                        return

            clip.status = "error"

    except Exception as e:
        print(f"Kling 오류: {e}")
        clip.status = "error"


async def run_all_clips(job_id, clips, frames, character, settings):
    frame_map = {f.sceneNumber: f for f in frames}
    for clip in clips:
        frame = frame_map.get(clip.sceneNumber)
        if frame:
            await generate_one_clip(clip, frame, character)


@router.post("/start", response_model=dict)
async def start_video_generation(req: StartRequest):
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    clips = []
    seen = set()
    for frame in req.frames:
        if frame.sceneNumber not in seen:
            seen.add(frame.sceneNumber)
            clip = VideoClip(
                clipId=f"clip_{frame.sceneNumber}_{uuid.uuid4().hex[:6]}",
                sceneNumber=frame.sceneNumber,
                durationSeconds=5,
                status="generating",
                veoPrompt=build_prompt(frame, req.character),
            )
            clips.append(clip)

    _jobs[job_id] = clips
    asyncio.create_task(run_all_clips(job_id, clips, req.frames, req.character, req.settings))

    return {"success": True, "data": {"jobId": job_id, "clips": [c.model_dump() for c in clips]}}


@router.get("/status/{job_id}", response_model=dict)
async def poll_video_status(job_id: str):
    clips = _jobs.get(job_id)
    if clips is None:
        raise HTTPException(status_code=404, detail="잡을 찾을 수 없습니다")
    return {"success": True, "data": [c.model_dump() for c in clips]}
