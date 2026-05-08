"""
시나리오 생성 라우터
====================================
Gemini 2.0 Flash API를 호출하여
장면별 시나리오 + 대사를 자동 생성합니다.
"""
import json
import os
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
 
router = APIRouter()
 
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
model = genai.GenerativeModel("gemini-2.0-flash")
 
 
class ScenarioInput(BaseModel):
    topic: str
    keyMessage: str
    duration: int
    mood: str
    coreDialogue: str = ""
 
 
class SceneScript(BaseModel):
    sceneNumber: int
    timeRange: str
    description: str
    dialogue: str
    cameraNote: str = ""
 
 
class ScenarioResult(BaseModel):
    scenes: list[SceneScript]
    totalDuration: int
    createdAt: str
 
 
def calc_scenes(duration: int) -> int:
    if duration == 15: return 2
    if duration == 30: return 3
    return 5
 
 
def build_prompt(inp: ScenarioInput) -> str:
    scene_count = calc_scenes(inp.duration)
    core_line = f"\n- 반드시 포함할 핵심 대사: '{inp.coreDialogue}'" if inp.coreDialogue else ""
 
    return f"""
당신은 동물 캐릭터를 활용한 기업 홍보 영상 전문 작가입니다.
아래 요구사항을 바탕으로 {inp.duration}초짜리 영상 시나리오를 작성해주세요.
 
[요구사항]
- 영상 주제: {inp.topic}
- 핵심 메시지: {inp.keyMessage}
- 톤 & 무드: {inp.mood}
- 총 장면 수: {scene_count}개{core_line}
 
[출력 형식]
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력합니다.
 
{{
  "scenes": [
    {{
      "sceneNumber": 1,
      "timeRange": "0-{inp.duration // scene_count}초",
      "description": "장면 내용을 2-3문장으로 설명. 동물 캐릭터의 행동과 배경을 구체적으로.",
      "dialogue": "캐릭터가 말하는 대사. 자연스럽고 {inp.mood} 톤으로.",
      "cameraNote": "카메라 앵글/이동 지시"
    }}
  ],
  "totalDuration": {inp.duration}
}}
 
[중요 규칙]
1. 모든 장면에 동물 캐릭터가 주인공으로 등장해야 합니다
2. 마지막 장면에는 반드시 브랜드/제품 클로징이 포함되어야 합니다
3. JSON 이외의 텍스트는 절대 출력하지 마세요
""".strip()
 
 
@router.post("/generate", response_model=dict)
async def generate_scenario(inp: ScenarioInput):
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")
 
    try:
        prompt = build_prompt(inp)
        response = await model.generate_content_async(
            prompt,
            generation_config={
                "temperature": 0.8,
                "max_output_tokens": 2048,
            }
        )
 
        raw_json = response.text.strip()
 
        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError:
            import re
            match = re.search(r'\{.*\}', raw_json, re.DOTALL)
            if not match:
                raise HTTPException(status_code=500, detail="Gemini 응답 파싱 실패")
            data = json.loads(match.group())
 
        result = ScenarioResult(
            scenes=[SceneScript(**s) for s in data["scenes"]],
            totalDuration=data.get("totalDuration", inp.duration),
            createdAt=datetime.now().isoformat(),
        )
 
        return {"success": True, "data": result.model_dump()}
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시나리오 생성 오류: {str(e)}")
