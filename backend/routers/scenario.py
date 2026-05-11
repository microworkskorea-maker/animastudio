"""
시나리오 생성 라우터 - gemini-2.5-flash
"""
import json
import os
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
 
router = APIRouter()
 
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
model = genai.GenerativeModel("gemini-2.5-flash")
 
 
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
    core_line = f"\n- 반드시 포함할 핵심 대사: {inp.coreDialogue}" if inp.coreDialogue else ""
 
    return f"""동물 캐릭터 기업 홍보 영상 시나리오를 JSON으로만 작성하세요.
 
주제: {inp.topic}
핵심 메시지: {inp.keyMessage}
톤: {inp.mood}
장면 수: {scene_count}개
영상 길이: {inp.duration}초{core_line}
 
규칙:
1. JSON만 출력. 다른 텍스트 금지.
2. 마크다운 코드블록 금지.
3. 모든 장면에 동물 캐릭터 등장.
4. 마지막 장면에 브랜드 클로징 포함.
 
출력 형식:
{{"scenes":[{{"sceneNumber":1,"timeRange":"0-10초","description":"장면설명","dialogue":"대사","cameraNote":"카메라지시"}}],"totalDuration":{inp.duration}}}"""
 
 
@router.post("/generate", response_model=dict)
async def generate_scenario(inp: ScenarioInput):
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")
 
    try:
        prompt = build_prompt(inp)
        response = await model.generate_content_async(
            prompt,
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 2048,
            }
        )
 
        raw = response.text.strip()
        raw = re.sub(r'```json\s*', '', raw)
        raw = re.sub(r'```\s*', '', raw)
        raw = raw.strip()
 
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            raw = match.group()
 
        data = json.loads(raw)
 
        result = ScenarioResult(
            scenes=[SceneScript(**s) for s in data["scenes"]],
            totalDuration=data.get("totalDuration", inp.duration),
            createdAt=datetime.now().isoformat(),
        )
 
        return {"success": True, "data": result.model_dump()}
 
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON 파싱 실패: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시나리오 생성 오류: {str(e)}")
