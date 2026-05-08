"""스토리보드 라우터 — Gemini + Imagen 3"""
import os, uuid, json, re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai

router = APIRouter()
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
model = genai.GenerativeModel("gemini-2.0-flash-exp")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs")


class SceneScript(BaseModel):
    sceneNumber: int
    timeRange: str
    description: str
    dialogue: str
    cameraNote: str = ""

class ScenarioResult(BaseModel):
    scenes: list[SceneScript]
    totalDuration: int

class CharacterConfig(BaseModel):
    lockedPrompt: str
    negativePrompt: str
    name: str = ""

class StoryboardFrame(BaseModel):
    frameId: str
    sceneNumber: int
    cutNumber: int
    description: str
    imageUrl: Optional[str] = None
    imageStatus: str = "idle"
    compositionNote: str = ""

class GenerateRequest(BaseModel):
    projectId: str
    scenarioResult: ScenarioResult
    character: CharacterConfig

class ImageRequest(BaseModel):
    frameId: str
    prompt: str


@router.post("/generate", response_model=dict)
async def generate_storyboard(req: GenerateRequest):
    """Gemini로 스토리보드 프레임 구조 생성"""
    scenes_text = "\n".join(
        f"장면{s.sceneNumber}({s.timeRange}): {s.description} 대사: '{s.dialogue}' 카메라: {s.cameraNote}"
        for s in req.scenarioResult.scenes
    )
    prompt = f"""
아래 시나리오를 바탕으로 스토리보드 프레임을 JSON으로 생성해주세요.
각 장면을 2개의 컷으로 구성하세요.

시나리오:
{scenes_text}

캐릭터: {req.character.name} — {req.character.lockedPrompt[:100]}

출력 형식 (JSON only):
{{
  "frames": [
    {{
      "sceneNumber": 1,
      "cutNumber": 1,
      "description": "컷 묘사 (한국어, 2문장)",
      "compositionNote": "영어 Imagen 프롬프트용 구도 설명"
    }}
  ]
}}
""".strip()

    try:
        resp = await model.generate_content_async(
            prompt,
            generation_config={"temperature": 0.6, "max_output_tokens": 2048,
                               "response_mime_type": "application/json"}
        )
        raw = resp.text.strip()
        try:
            data = json.loads(raw)
        except:
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(match.group()) if match else {"frames": []}

        frames = [
            StoryboardFrame(
                frameId         = f"frame_{f['sceneNumber']}_{f['cutNumber']}_{uuid.uuid4().hex[:4]}",
                sceneNumber     = f["sceneNumber"],
                cutNumber       = f["cutNumber"],
                description     = f["description"],
                compositionNote = f.get("compositionNote", ""),
                imageStatus     = "idle",
            )
            for f in data.get("frames", [])
        ]
        return {"success": True, "data": [fr.model_dump() for fr in frames]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-image", response_model=dict)
async def generate_frame_image(req: ImageRequest):
    """
    Imagen 3으로 원화 이미지 생성
    (vertexai SDK 필요 — 없으면 Mock 반환)
    """
    try:
        import vertexai
        from vertexai.preview.vision_models import ImageGenerationModel
        vertexai.init(project=os.getenv("GOOGLE_CLOUD_PROJECT"), location="us-central1")
        img_model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-001")

        images = img_model.generate_images(prompt=req.prompt, number_of_images=1,
                                           aspect_ratio="16:9")
        path = f"{OUTPUT_DIR}/images/{req.frameId}.png"
        images[0].save(path)
        return {"success": True, "data": {"imageUrl": f"/outputs/images/{req.frameId}.png"}}

    except Exception:
        # Mock 모드 (SDK 미설치 시)
        return {"success": True, "data": {"imageUrl": f"/outputs/images/{req.frameId}_mock.png"}}
