"""
영상 생성 라우터 — Google Veo 3 (Vertex AI)
============================================
핵심 전략: 캐릭터 페르소나 파괴 방지
1. lockedPrompt를 모든 장면 프롬프트 앞에 주입
2. image-to-video 모드로 원화 기반 생성 → 일관성 극대화
3. 비동기 생성 → jobId 반환 → 폴링으로 완료 확인
"""
import os
import uuid
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs")

# ── Vertex AI / Veo 클라이언트 ────────────────
def get_veo_client():
    """
    Vertex AI Veo 3 클라이언트 반환
    실제 SDK: google-cloud-aiplatform >= 1.60
    """
    try:
        import vertexai
        from vertexai.preview.vision_models import VideoGenerationModel
        vertexai.init(project=os.getenv("GOOGLE_CLOUD_PROJECT"), location="us-central1")
        return VideoGenerationModel.from_pretrained("veo-3.0-generate-preview")
    except ImportError:
        return None   # SDK 미설치 시 mock 모드


# ── 모델 ─────────────────────────────────────
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
    thumbnailUrl: Optional[str] = None
    durationSeconds: int
    status: str            # idle | generating | done | error
    veoPrompt: str = ""


class StartRequest(BaseModel):
    projectId: str
    frames: list[StoryboardFrame]
    character: CharacterConfig
    settings: VideoSettings


# ── 인메모리 잡 관리 ─────────────────────────
_jobs: dict[str, list[VideoClip]] = {}


# ── Veo 프롬프트 빌더 ─────────────────────────
def build_veo_prompt(
    frame: StoryboardFrame,
    character: CharacterConfig,
    settings: VideoSettings,
) -> str:
    """
    페르소나 고정 전략:
    [캐릭터 고정 프롬프트] + [장면 설명] + [스타일 지시]
    """
    style_map = {
        "1080p": "high quality 1080p",
        "720p":  "720p HD",
        "4K":    "4K ultra high definition",
    }
    fps_note = f"{settings.fps}fps smooth motion"

    prompt = (
        f"{character.lockedPrompt}, "           # ← 캐릭터 고정 (항상 앞에)
        f"{frame.description}. "
        f"{frame.compositionNote}. "
        f"brand mascot advertisement style, "
        f"{style_map.get(settings.resolution, 'high quality')}, "
        f"{fps_note}, "
        f"professional commercial video, warm lighting, "
        f"consistent character design throughout"
    )
    return prompt.strip()


# ── 실제 Veo API 호출 (비동기) ────────────────
async def generate_clip_async(clip: VideoClip, frame: StoryboardFrame, character: CharacterConfig, settings: VideoSettings):
    """
    Veo 3로 단일 클립 생성
    이미지가 있으면 image-to-video, 없으면 text-to-video
    """
    client = get_veo_client()

    if client is None:
        # ── Mock 모드 (API 키 없을 때) ──
        await asyncio.sleep(3)
        mock_path = f"{OUTPUT_DIR}/videos/{clip.clipId}.mp4"
        # 실제 파일이 없어도 경로만 반환 (UI 테스트용)
        clip.videoUrl = f"/outputs/videos/{clip.clipId}.mp4"
        clip.status   = "done"
        return

    try:
        prompt = clip.veoPrompt

        if frame.imageUrl and frame.imageUrl.startswith("/outputs"):
            # ── Image-to-Video 모드 ──
            import PIL.Image
            img_path = frame.imageUrl.replace("/outputs", OUTPUT_DIR)
            img = PIL.Image.open(img_path)

            operation = client.generate_video(
                prompt=prompt,
                image=img,
                negative_prompt=character.negativePrompt,
                duration_seconds=8,
                fps=settings.fps,
                aspect_ratio="16:9",
            )
        else:
            # ── Text-to-Video 모드 ──
            operation = client.generate_video(
                prompt=prompt,
                negative_prompt=character.negativePrompt,
                duration_seconds=8,
                fps=settings.fps,
                aspect_ratio="16:9",
            )

        # 완료 대기 (Veo는 보통 1–5분 소요)
        result = operation.result(timeout=300)

        # 결과 저장
        output_path = f"{OUTPUT_DIR}/videos/{clip.clipId}.mp4"
        result.videos[0].save(output_path)

        clip.videoUrl = f"/outputs/videos/{clip.clipId}.mp4"
        clip.status   = "done"

    except Exception as e:
        clip.status = "error"
        print(f"Veo 생성 오류 [{clip.clipId}]: {e}")


# ── 엔드포인트 ────────────────────────────────
@router.post("/start", response_model=dict)
async def start_video_generation(req: StartRequest):
    """
    영상 생성 시작 (비동기 잡)

    POST /video/start
    Returns: { jobId, clips }
    """
    job_id = f"job_{uuid.uuid4().hex[:8]}"

    # 장면별 클립 초기화
    clips: list[VideoClip] = []
    for frame in req.frames:
        clip = VideoClip(
            clipId          = f"clip_{frame.sceneNumber}_{uuid.uuid4().hex[:6]}",
            sceneNumber     = frame.sceneNumber,
            durationSeconds = 8,
            status          = "generating",
            veoPrompt       = build_veo_prompt(frame, req.character, req.settings),
        )
        clips.append(clip)

    _jobs[job_id] = clips

    # 비동기로 모든 클립 생성 시작 (병렬)
    asyncio.create_task(
        run_all_clips(job_id, clips, req.frames, req.character, req.settings)
    )

    return {
        "success": True,
        "data": {
            "jobId": job_id,
            "clips": [c.model_dump() for c in clips],
        }
    }


async def run_all_clips(job_id, clips, frames, character, settings):
    """모든 클립을 순차 생성 (Veo API 동시 요청 제한 고려)"""
    frame_map = {f.sceneNumber: f for f in frames}
    for clip in clips:
        frame = frame_map.get(clip.sceneNumber)
        if frame:
            await generate_clip_async(clip, frame, character, settings)


@router.get("/status/{job_id}", response_model=dict)
async def poll_video_status(job_id: str):
    """
    클립 생성 상태 폴링 (2초 간격 권장)

    GET /video/status/{jobId}
    """
    clips = _jobs.get(job_id)
    if clips is None:
        raise HTTPException(status_code=404, detail=f"잡을 찾을 수 없습니다: {job_id}")

    return {
        "success": True,
        "data": [c.model_dump() for c in clips],
    }
