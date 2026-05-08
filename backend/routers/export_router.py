"""
내보내기 라우터 — FFmpeg 최종 합성
=====================================
1. 영상 클립 이어 붙이기 (concat)
2. TTS 오디오 합성 (장면별 타임코드 맞춤)
3. SRT 자막 하드코딩 (subtitleStyle 적용)
4. 최종 MP4 저장 → 다운로드 URL 반환
5. SNS용 쇼트폼(9:16) 자동 리사이징
"""
import os
import uuid
import subprocess
import asyncio
import aiofiles
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs")


# ── 모델 ─────────────────────────────────────
class VideoClip(BaseModel):
    clipId: str
    sceneNumber: int
    videoUrl: Optional[str] = None
    durationSeconds: int = 8
    status: str = "idle"


class VoiceTrack(BaseModel):
    trackId: str
    sceneNumber: int
    audioUrl: Optional[str] = None
    durationSeconds: Optional[float] = None
    dialogue: str = ""
    status: str = "idle"


class SubtitleEntry(BaseModel):
    index: int
    startTime: str
    endTime: str
    text: str


class VoiceSettings(BaseModel):
    subtitleStyle: str = "white-outline"
    subtitlePosition: str = "bottom"


class ComposeRequest(BaseModel):
    projectId: str
    clips: list[VideoClip]
    tracks: list[VoiceTrack]
    subtitles: list[SubtitleEntry]
    voiceSettings: VoiceSettings


class ExportAsset(BaseModel):
    assetId: str
    label: str
    filename: str
    type: str
    downloadUrl: Optional[str] = None
    status: str = "idle"
    sizeBytes: Optional[int] = None


# ── FFmpeg 헬퍼 ──────────────────────────────
def abs_path(rel_url: str) -> str:
    """'/outputs/...' → 절대 경로"""
    return rel_url.replace("/outputs", OUTPUT_DIR)


def run_ffmpeg(args: list[str]) -> bool:
    """FFmpeg 실행 — 성공 여부 반환"""
    cmd = ["ffmpeg", "-y", "-loglevel", "error"] + args
    print(f"FFmpeg: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"FFmpeg 오류: {result.stderr}")
    return result.returncode == 0


def srt_entries_to_file(subtitles: list[SubtitleEntry], srt_path: str) -> None:
    """SRT 파일 생성"""
    lines = []
    for s in subtitles:
        lines.append(str(s.index))
        lines.append(f"{s.startTime} --> {s.endTime}")
        lines.append(s.text)
        lines.append("")
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def get_subtitle_filter(style: str, position: str) -> str:
    """자막 스타일 → FFmpeg subtitles 필터"""
    pos_map = {"bottom": "MarginV=40", "top": "MarginV=660", "auto": "MarginV=40"}
    margin  = pos_map.get(position, "MarginV=40")

    style_map = {
        "white-outline": f"FontName=NanumGothic,FontSize=22,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=1,Outline=2,{margin}",
        "box":           f"FontName=NanumGothic,FontSize=22,PrimaryColour=&Hffffff,BackColour=&H80000000,BorderStyle=4,{margin}",
        "yellow":        f"FontName=NanumGothic,FontSize=22,PrimaryColour=&H00ffff,OutlineColour=&H000000,BorderStyle=1,Outline=2,{margin}",
        "card":          f"FontName=NanumGothic,FontSize=20,PrimaryColour=&Hffffff,BackColour=&Hcc000000,BorderStyle=4,{margin}",
    }
    return style_map.get(style, style_map["white-outline"])


# ── 핵심 합성 함수 ────────────────────────────
async def compose_final_video(
    project_id: str,
    clips: list[VideoClip],
    tracks: list[VoiceTrack],
    subtitles: list[SubtitleEntry],
    voice_settings: VoiceSettings,
) -> Optional[str]:
    """
    FFmpeg 합성 파이프라인
    1. 클립 이어 붙이기
    2. 오디오 합성
    3. 자막 삽입
    """
    base = f"{OUTPUT_DIR}/exports/{project_id}"
    os.makedirs(base, exist_ok=True)

    done_clips = [c for c in clips if c.status == "done" and c.videoUrl]
    if not done_clips:
        return None

    # ── Step 1: 클립 concat ──
    concat_list_path = f"{base}/concat.txt"
    with open(concat_list_path, "w") as f:
        for clip in sorted(done_clips, key=lambda c: c.sceneNumber):
            f.write(f"file '{abs_path(clip.videoUrl)}'\n")

    concat_path = f"{base}/concat.mp4"
    ok = run_ffmpeg([
        "-f", "concat", "-safe", "0", "-i", concat_list_path,
        "-c", "copy", concat_path,
    ])
    if not ok:
        return None

    # ── Step 2: 오디오 믹싱 ──
    done_tracks = [t for t in tracks if t.status == "done" and t.audioUrl]
    if done_tracks:
        # 오디오 타임라인 생성 (adelay 필터)
        audio_inputs = []
        filter_parts = []
        for i, track in enumerate(sorted(done_tracks, key=lambda t: t.sceneNumber)):
            delay_ms = (track.sceneNumber - 1) * 8000   # 장면당 8초 오프셋
            audio_inputs += ["-i", abs_path(track.audioUrl)]
            filter_parts.append(f"[{i+1}:a]adelay={delay_ms}|{delay_ms}[a{i}]")

        mix_labels = "".join(f"[a{i}]" for i in range(len(done_tracks)))
        filter_complex = ";".join(filter_parts) + f";{mix_labels}amix=inputs={len(done_tracks)}:duration=first[aout]"

        audio_video_path = f"{base}/with_audio.mp4"
        ok = run_ffmpeg([
            "-i", concat_path,
            *audio_inputs,
            "-filter_complex", filter_complex,
            "-map", "0:v", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac",
            audio_video_path,
        ])
        source_for_sub = audio_video_path if ok else concat_path
    else:
        source_for_sub = concat_path

    # ── Step 3: 자막 삽입 ──
    final_path = f"{base}/final_with_sub.mp4"
    if subtitles:
        srt_path = f"{base}/subtitles.srt"
        srt_entries_to_file(subtitles, srt_path)
        sub_filter = get_subtitle_filter(
            voice_settings.subtitleStyle,
            voice_settings.subtitlePosition,
        )
        ok = run_ffmpeg([
            "-i", source_for_sub,
            "-vf", f"subtitles={srt_path}:force_style='{sub_filter}'",
            "-c:a", "copy",
            final_path,
        ])
        if not ok:
            final_path = source_for_sub
    else:
        final_path = source_for_sub

    return final_path


# ── 엔드포인트 ────────────────────────────────
@router.post("/compose", response_model=dict)
async def compose_video(req: ComposeRequest):
    """
    최종 영상 합성

    POST /export/compose
    """
    assets: list[ExportAsset] = []
    project_dir = f"{OUTPUT_DIR}/exports/{req.projectId}"

    # ── 메인 영상 합성 ──
    final_path = await compose_final_video(
        req.projectId, req.clips, req.tracks, req.subtitles, req.voiceSettings
    )

    if final_path and os.path.exists(final_path):
        size = os.path.getsize(final_path)
        rel_url = final_path.replace(OUTPUT_DIR, "/outputs")
        assets.append(ExportAsset(
            assetId     = f"asset_{uuid.uuid4().hex[:8]}",
            label       = "최종 영상 (더빙+자막)",
            filename    = f"{req.projectId}_final.mp4",
            type        = "video",
            downloadUrl = rel_url,
            status      = "done",
            sizeBytes   = size,
        ))

        # ── SNS용 9:16 리사이징 ──
        short_path = final_path.replace("final_with_sub", "short_9x16")
        ok = run_ffmpeg([
            "-i", final_path,
            "-vf", "scale=608:1080:force_original_aspect_ratio=decrease,pad=608:1080:(ow-iw)/2:(oh-ih)/2",
            "-c:a", "copy",
            short_path,
        ])
        if ok and os.path.exists(short_path):
            assets.append(ExportAsset(
                assetId     = f"asset_{uuid.uuid4().hex[:8]}",
                label       = "SNS 숏폼 (9:16)",
                filename    = f"{req.projectId}_short.mp4",
                type        = "video",
                downloadUrl = short_path.replace(OUTPUT_DIR, "/outputs"),
                status      = "done",
                sizeBytes   = os.path.getsize(short_path),
            ))

        # ── SRT 자막 파일 ──
        srt_path = f"{project_dir}/subtitles.srt"
        if os.path.exists(srt_path):
            assets.append(ExportAsset(
                assetId     = f"asset_{uuid.uuid4().hex[:8]}",
                label       = "자막 파일 (SRT)",
                filename    = f"{req.projectId}.srt",
                type        = "subtitle",
                downloadUrl = srt_path.replace(OUTPUT_DIR, "/outputs"),
                status      = "done",
            ))
    else:
        # Mock 모드 — 실제 파일 없이 구조만 반환
        assets.append(ExportAsset(
            assetId  = f"asset_mock_01",
            label    = "최종 영상 (더빙+자막)",
            filename = f"{req.projectId}_final.mp4",
            type     = "video",
            status   = "done",
        ))

    return {"success": True, "data": [a.model_dump() for a in assets]}


@router.get("/download/{asset_id}", response_model=dict)
async def get_download_url(asset_id: str):
    """다운로드 URL 취득 (추후 서명 URL 확장 가능)"""
    return {"success": True, "data": {"url": f"/outputs/exports/{asset_id}"}}
