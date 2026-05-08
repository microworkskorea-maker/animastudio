// ─────────────────────────────────────────────
//  AnimaStudio — 공유 타입 정의
// ─────────────────────────────────────────────

export type PipelineStep =
  | 'scenario'
  | 'character'
  | 'storyboard'
  | 'video'
  | 'voice'
  | 'export'

export type StepStatus = 'idle' | 'generating' | 'done' | 'error'

// ── 시나리오 ──────────────────────────────────
export interface SceneScript {
  sceneNumber: number      // 1, 2, 3
  timeRange: string        // "0–8초"
  description: string      // 장면 설명
  dialogue: string         // 대사
  cameraNote?: string      // 카메라 지시 (선택)
}

export interface ScenarioInput {
  topic: string            // 영상 주제
  keyMessage: string       // 핵심 메시지
  duration: 15 | 30 | 60  // 영상 길이(초)
  mood: string             // 톤 & 무드
  coreDialogue?: string    // 핵심 대사 (선택)
}

export interface ScenarioResult {
  scenes: SceneScript[]
  totalDuration: number
  createdAt: string
}

// ── 캐릭터 ──────────────────────────────────
export interface CharacterConfig {
  name: string
  role: string
  emoji: string
  personality: string      // 성격 키워드
  speechStyle: string      // 말투 스타일
  lockedPrompt: string     // Veo용 고정 프롬프트
  negativePrompt: string   // 페르소나 파괴 방지
  imageBase64?: string     // 업로드된 원본 이미지
  analysisNote?: string    // Gemini Vision 분석 결과
}

// ── 스토리보드 ────────────────────────────────
export interface StoryboardFrame {
  frameId: string
  sceneNumber: number
  cutNumber: number        // 장면 내 컷 번호
  description: string
  imageUrl?: string        // 생성된 원화 이미지 URL
  imageStatus: StepStatus
  compositionNote?: string // 구도 지시
}

// ── 영상 ────────────────────────────────────
export interface VideoClip {
  clipId: string
  sceneNumber: number
  videoUrl?: string
  thumbnailUrl?: string
  durationSeconds: number
  status: StepStatus
  veoPrompt: string        // 실제 사용된 Veo 프롬프트 (디버깅용)
}

export interface VideoSettings {
  resolution: '720p' | '1080p' | '4K'
  fps: 24 | 30
  transition: 'fade' | 'cut' | 'slide'
  bgMusic: string | null
}

// ── 더빙 & 자막 ──────────────────────────────
export interface VoiceTrack {
  trackId: string
  sceneNumber: number
  dialogue: string
  audioUrl?: string
  durationSeconds?: number
  status: StepStatus
}

export interface SubtitleEntry {
  index: number
  startTime: string        // "00:00:01,000"
  endTime: string          // "00:00:04,200"
  text: string
}

export interface VoiceSettings {
  engine: 'elevenlabs' | 'google' | 'gemini'
  voiceId: string
  voiceLabel: string
  speed: number            // 0.8 ~ 1.3
  emotion: 'neutral' | 'cheerful' | 'calm'
  subtitleStyle: 'white-outline' | 'box' | 'yellow' | 'card'
  subtitlePosition: 'bottom' | 'top' | 'auto'
}

// ── 최종 내보내기 ─────────────────────────────
export interface ExportAsset {
  assetId: string
  label: string
  filename: string
  type: 'video' | 'document' | 'image-zip' | 'subtitle'
  downloadUrl?: string
  status: StepStatus
  sizeBytes?: number
}

// ── 프로젝트 전체 ─────────────────────────────
export interface Project {
  projectId: string
  name: string
  createdAt: string
  updatedAt: string
  currentStep: PipelineStep
  stepStatus: Record<PipelineStep, StepStatus>

  // 각 단계 데이터
  scenarioInput?: ScenarioInput
  scenarioResult?: ScenarioResult
  character?: CharacterConfig
  storyboard?: StoryboardFrame[]
  videoSettings?: VideoSettings
  videoClips?: VideoClip[]
  voiceSettings?: VoiceSettings
  voiceTracks?: VoiceTrack[]
  subtitles?: SubtitleEntry[]
  exports?: ExportAsset[]
}

// ── API 응답 공통 ─────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
