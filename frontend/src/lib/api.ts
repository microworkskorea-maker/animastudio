/**
 * AnimaStudio — 백엔드 API 클라이언트
 *
 * 모든 AI 호출은 FastAPI 백엔드(localhost:8000)를 통해 이루어집니다.
 * Next.js의 rewrites를 통해 /api/backend/* → http://localhost:8000/*
 */
import axios from 'axios'
import type {
  ScenarioInput,
  ScenarioResult,
  CharacterConfig,
  StoryboardFrame,
  VideoClip,
  VideoSettings,
  VoiceTrack,
  VoiceSettings,
  SubtitleEntry,
  ExportAsset,
  ApiResponse,
} from '@/types'

const api = axios.create({
  baseURL: '/api/backend',
  timeout: 120_000,   // AI 생성은 최대 2분
})

// ── 에러 인터셉터 ───────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail ?? err.message ?? '알 수 없는 오류'
    return Promise.reject(new Error(msg))
  }
)

// ────────────────────────────────────────────
//  시나리오 API
// ────────────────────────────────────────────
export const scenarioApi = {
  /**
   * Gemini 2.0 Flash로 시나리오 생성
   */
  generate: async (input: ScenarioInput): Promise<ScenarioResult> => {
    const res = await api.post<ApiResponse<ScenarioResult>>('/scenario/generate', input)
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },
}

// ────────────────────────────────────────────
//  캐릭터 API
// ────────────────────────────────────────────
export const characterApi = {
  /**
   * Gemini Vision으로 업로드 이미지 분석 → 페르소나 프롬프트 추출
   */
  analyzeImage: async (imageBase64: string): Promise<Partial<CharacterConfig>> => {
    const res = await api.post<ApiResponse<Partial<CharacterConfig>>>(
      '/character/analyze',
      { imageBase64 }
    )
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },

  /**
   * 캐릭터 페르소나 저장 (서버 세션 공유용)
   */
  save: async (config: CharacterConfig): Promise<{ saved: boolean }> => {
    const res = await api.post<ApiResponse<{ saved: boolean }>>('/character/save', config)
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },
}

// ────────────────────────────────────────────
//  스토리보드 API
// ────────────────────────────────────────────
export const storyboardApi = {
  /**
   * 시나리오 → 스토리보드 프레임 구조 생성 (Gemini)
   */
  generate: async (
    projectId: string,
    scenarioResult: ScenarioResult,
    character: CharacterConfig
  ): Promise<StoryboardFrame[]> => {
    const res = await api.post<ApiResponse<StoryboardFrame[]>>('/storyboard/generate', {
      projectId,
      scenarioResult,
      character,
    })
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },

  /**
   * 개별 프레임 원화 이미지 생성 (Imagen 3)
   * - 한 번에 하나씩 생성 후 폴링
   */
  generateFrameImage: async (
    frameId: string,
    prompt: string
  ): Promise<{ imageUrl: string }> => {
    const res = await api.post<ApiResponse<{ imageUrl: string }>>(
      '/storyboard/generate-image',
      { frameId, prompt }
    )
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },
}

// ────────────────────────────────────────────
//  영상 생성 API
// ────────────────────────────────────────────
export const videoApi = {
  /**
   * Veo 3로 장면별 영상 클립 생성 시작
   * - 비동기: 즉시 jobId 반환 → pollStatus로 완료 확인
   */
  startGeneration: async (
    projectId: string,
    frames: StoryboardFrame[],
    character: CharacterConfig,
    settings: VideoSettings
  ): Promise<{ jobId: string; clips: VideoClip[] }> => {
    const res = await api.post<ApiResponse<{ jobId: string; clips: VideoClip[] }>>(
      '/video/start',
      { projectId, frames, character, settings }
    )
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },

  /**
   * 클립 생성 상태 폴링 (2초 간격 권장)
   */
  pollStatus: async (jobId: string): Promise<VideoClip[]> => {
    const res = await api.get<ApiResponse<VideoClip[]>>(`/video/status/${jobId}`)
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },
}

// ────────────────────────────────────────────
//  더빙 & 자막 API
// ────────────────────────────────────────────
export const voiceApi = {
  /**
   * ElevenLabs TTS로 대사별 오디오 생성
   */
  generateTracks: async (
    projectId: string,
    dialogues: Array<{ sceneNumber: number; text: string }>,
    settings: VoiceSettings
  ): Promise<VoiceTrack[]> => {
    const res = await api.post<ApiResponse<VoiceTrack[]>>('/voice/generate', {
      projectId,
      dialogues,
      settings,
    })
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },

  /**
   * 오디오 타임스탬프 기반 SRT 자막 자동 생성
   */
  generateSubtitles: async (
    tracks: VoiceTrack[]
  ): Promise<SubtitleEntry[]> => {
    const res = await api.post<ApiResponse<SubtitleEntry[]>>('/voice/subtitles', { tracks })
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },
}

// ────────────────────────────────────────────
//  최종 합성 & 내보내기 API
// ────────────────────────────────────────────
export const exportApi = {
  /**
   * FFmpeg로 클립 + 오디오 + 자막 최종 합성
   */
  compose: async (
    projectId: string,
    clips: VideoClip[],
    tracks: VoiceTrack[],
    subtitles: SubtitleEntry[],
    voiceSettings: VoiceSettings
  ): Promise<ExportAsset[]> => {
    const res = await api.post<ApiResponse<ExportAsset[]>>('/export/compose', {
      projectId,
      clips,
      tracks,
      subtitles,
      voiceSettings,
    })
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },

  /**
   * 다운로드 URL 취득 (서명된 URL 또는 직접 파일 경로)
   */
  getDownloadUrl: async (assetId: string): Promise<{ url: string }> => {
    const res = await api.get<ApiResponse<{ url: string }>>(`/export/download/${assetId}`)
    if (!res.data.success || !res.data.data) throw new Error(res.data.error)
    return res.data.data
  },
}
