/**
 * AnimaStudio — 전역 파이프라인 상태 관리 (Zustand)
 *
 * 사용법:
 *   const { project, setScenarioResult, goToStep } = useStudioStore()
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Project,
  PipelineStep,
  StepStatus,
  ScenarioInput,
  ScenarioResult,
  CharacterConfig,
  StoryboardFrame,
  VideoSettings,
  VideoClip,
  VoiceSettings,
  VoiceTrack,
  SubtitleEntry,
  ExportAsset,
} from '@/types'

// ── 파이프라인 순서 정의 ──────────────────────
export const PIPELINE_STEPS: PipelineStep[] = [
  'scenario',
  'character',
  'storyboard',
  'video',
  'voice',
  'export',
]

export const STEP_LABELS: Record<PipelineStep, string> = {
  scenario:   '시나리오',
  character:  '캐릭터',
  storyboard: '스토리보드',
  video:      '영상 생성',
  voice:      '더빙 & 자막',
  export:     '내보내기',
}

// ── 초기 프로젝트 팩토리 ──────────────────────
const createDefaultProject = (): Project => ({
  projectId: `proj_${Date.now()}`,
  name:       '새 프로젝트',
  createdAt:  new Date().toISOString(),
  updatedAt:  new Date().toISOString(),
  currentStep: 'scenario',
  stepStatus: {
    scenario:   'idle',
    character:  'idle',
    storyboard: 'idle',
    video:      'idle',
    voice:      'idle',
    export:     'idle',
  },
})

// ── 스토어 타입 ──────────────────────────────
interface StudioStore {
  project: Project

  // 네비게이션
  goToStep: (step: PipelineStep) => void

  // 단계별 상태 업데이트
  setStepStatus: (step: PipelineStep, status: StepStatus) => void

  // 시나리오
  setScenarioInput: (input: ScenarioInput) => void
  setScenarioResult: (result: ScenarioResult) => void

  // 캐릭터
  setCharacter: (character: CharacterConfig) => void

  // 스토리보드
  setStoryboard: (frames: StoryboardFrame[]) => void
  updateFrame: (frameId: string, patch: Partial<StoryboardFrame>) => void

  // 영상
  setVideoSettings: (settings: VideoSettings) => void
  setVideoClips: (clips: VideoClip[]) => void
  updateClip: (clipId: string, patch: Partial<VideoClip>) => void

  // 더빙 & 자막
  setVoiceSettings: (settings: VoiceSettings) => void
  setVoiceTracks: (tracks: VoiceTrack[]) => void
  setSubtitles: (subtitles: SubtitleEntry[]) => void

  // 내보내기
  setExports: (assets: ExportAsset[]) => void
  updateExport: (assetId: string, patch: Partial<ExportAsset>) => void

  // 프로젝트 리셋
  resetProject: () => void
  setProjectName: (name: string) => void
}

// ── 스토어 생성 ──────────────────────────────
export const useStudioStore = create<StudioStore>()(
  persist(
    (set) => ({
      project: createDefaultProject(),

      // ── 네비게이션 ──
      goToStep: (step) =>
        set((s) => ({
          project: { ...s.project, currentStep: step, updatedAt: new Date().toISOString() },
        })),

      // ── 단계 상태 ──
      setStepStatus: (step, status) =>
        set((s) => ({
          project: {
            ...s.project,
            stepStatus: { ...s.project.stepStatus, [step]: status },
            updatedAt: new Date().toISOString(),
          },
        })),

      // ── 시나리오 ──
      setScenarioInput: (input) =>
        set((s) => ({ project: { ...s.project, scenarioInput: input } })),

      setScenarioResult: (result) =>
        set((s) => ({
          project: {
            ...s.project,
            scenarioResult: result,
            stepStatus: { ...s.project.stepStatus, scenario: 'done' },
          },
        })),

      // ── 캐릭터 ──
      setCharacter: (character) =>
        set((s) => ({
          project: {
            ...s.project,
            character,
            stepStatus: { ...s.project.stepStatus, character: 'done' },
          },
        })),

      // ── 스토리보드 ──
      setStoryboard: (frames) =>
        set((s) => ({
          project: {
            ...s.project,
            storyboard: frames,
            stepStatus: { ...s.project.stepStatus, storyboard: 'done' },
          },
        })),

      updateFrame: (frameId, patch) =>
        set((s) => ({
          project: {
            ...s.project,
            storyboard: s.project.storyboard?.map((f) =>
              f.frameId === frameId ? { ...f, ...patch } : f
            ),
          },
        })),

      // ── 영상 ──
      setVideoSettings: (settings) =>
        set((s) => ({ project: { ...s.project, videoSettings: settings } })),

      setVideoClips: (clips) =>
        set((s) => ({ project: { ...s.project, videoClips: clips } })),

      updateClip: (clipId, patch) =>
        set((s) => ({
          project: {
            ...s.project,
            videoClips: s.project.videoClips?.map((c) =>
              c.clipId === clipId ? { ...c, ...patch } : c
            ),
          },
        })),

      // ── 더빙 & 자막 ──
      setVoiceSettings: (settings) =>
        set((s) => ({ project: { ...s.project, voiceSettings: settings } })),

      setVoiceTracks: (tracks) =>
        set((s) => ({ project: { ...s.project, voiceTracks: tracks } })),

      setSubtitles: (subtitles) =>
        set((s) => ({
          project: {
            ...s.project,
            subtitles,
            stepStatus: { ...s.project.stepStatus, voice: 'done' },
          },
        })),

      // ── 내보내기 ──
      setExports: (exports) =>
        set((s) => ({ project: { ...s.project, exports } })),

      updateExport: (assetId, patch) =>
        set((s) => ({
          project: {
            ...s.project,
            exports: s.project.exports?.map((a) =>
              a.assetId === assetId ? { ...a, ...patch } : a
            ),
          },
        })),

      // ── 유틸리티 ──
      resetProject: () => set({ project: createDefaultProject() }),

      setProjectName: (name) =>
        set((s) => ({ project: { ...s.project, name } })),
    }),
    { name: 'animastudio-project' }   // localStorage 키
  )
)
