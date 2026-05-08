"""
캐릭터 분석 라우터
====================================
Gemini Vision으로 업로드된 캐릭터 이미지를 분석하여
Veo 3 영상 생성에 사용할 페르소나 고정 프롬프트를 추출합니다.

핵심 전략: 페르소나 파괴 방지
- lockedPrompt  → Veo 프롬프트에 항상 앞부분에 주입
- negativePrompt → Veo negative_prompt에 주입
"""
import os
import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai

router = APIRouter()
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
vision_model = genai.GenerativeModel("gemini-2.0-flash-exp")


# ── 모델 ─────────────────────────────────────
class AnalyzeRequest(BaseModel):
    imageBase64: str          # data:image/png;base64,... 또는 순수 base64


class CharacterConfig(BaseModel):
    name: str         = ""
    role: str         = ""
    emoji: str        = "🐾"
    personality: str  = ""
    speechStyle: str  = ""
    lockedPrompt: str = ""    # Veo 긍정 프롬프트 (캐릭터 고정용)
    negativePrompt: str = ""  # Veo 부정 프롬프트 (변형 방지)
    analysisNote: str = ""    # 분석 요약 (사용자용)


class SaveRequest(BaseModel):
    name: str
    role: str
    emoji: str
    personality: str
    speechStyle: str
    lockedPrompt: str
    negativePrompt: str
    imageBase64: str = ""


# ── 이미지 분석 ───────────────────────────────
@router.post("/analyze", response_model=dict)
async def analyze_character_image(req: AnalyzeRequest):
    """
    Gemini Vision으로 캐릭터 이미지 분석
    → 외형 고정 프롬프트 + 네거티브 프롬프트 자동 생성

    POST /character/analyze
    Body: { imageBase64: string }
    """
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY 미설정")

    try:
        # base64 헤더 제거
        raw_b64 = req.imageBase64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]

        image_bytes = base64.b64decode(raw_b64)

        prompt = """
당신은 동물 캐릭터 일관성 전문가입니다.
업로드된 이미지의 동물 캐릭터를 분석하여 아래 JSON 형식으로 응답해주세요.

목표: 이 캐릭터가 AI 영상 생성(Veo 3)에서 항상 동일하게 표현될 수 있도록
매우 구체적이고 정확한 영문 프롬프트를 생성해야 합니다.

{
  "lockedPrompt": "영어로 작성. 캐릭터 외형을 매우 상세하게 묘사. 예: white fluffy rabbit character, round big blue eyes, wearing pastel yellow sweater, short round ears with pink inner, chubby cheeks, cheerful smile, consistent cartoon mascot style, soft 3D render, brand mascot design",
  "negativePrompt": "영어로 작성. 절대 변경되면 안 되는 요소들. 예: no color variation, no clothing change, no style change, no realistic style, no scary expression, maintain same character design throughout all scenes",
  "analysisNote": "한국어로 분석 요약. 캐릭터 특징 3–5줄.",
  "suggestedName": "캐릭터 이름 제안 (한국어)",
  "suggestedPersonality": "성격 키워드 3–4개 (한국어, 쉼표 구분)",
  "emoji": "이 캐릭터를 가장 잘 표현하는 이모지 1개"
}

JSON만 출력하세요.
"""

        response = await vision_model.generate_content_async(
            [
                prompt,
                {"mime_type": "image/png", "data": image_bytes},
            ],
            generation_config={
                "temperature": 0.4,
                "max_output_tokens": 1024,
                "response_mime_type": "application/json",
            }
        )

        import json, re
        raw = response.text.strip()
        try:
            data = json.loads(raw)
        except:
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            data = json.loads(match.group()) if match else {}

        result = CharacterConfig(
            lockedPrompt   = data.get("lockedPrompt", ""),
            negativePrompt = data.get("negativePrompt", ""),
            analysisNote   = data.get("analysisNote", ""),
            name           = data.get("suggestedName", ""),
            personality    = data.get("suggestedPersonality", ""),
            emoji          = data.get("emoji", "🐾"),
        )

        return {"success": True, "data": result.model_dump()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 분석 오류: {str(e)}")


# ── 캐릭터 저장 ───────────────────────────────
_saved_character: dict = {}   # 인메모리 세션 저장 (프로덕션은 DB 사용)

@router.post("/save", response_model=dict)
async def save_character(req: SaveRequest):
    """캐릭터 설정 저장 (영상 생성 단계에서 참조)"""
    global _saved_character
    _saved_character = req.model_dump()
    return {"success": True, "data": {"saved": True}}


@router.get("/current", response_model=dict)
async def get_current_character():
    """현재 저장된 캐릭터 조회"""
    if not _saved_character:
        raise HTTPException(status_code=404, detail="저장된 캐릭터가 없습니다")
    return {"success": True, "data": _saved_character}
