'use client'
import { useRouter } from 'next/navigation'
import { useStudioStore } from '@/lib/store'
import { useState } from 'react'
import toast from 'react-hot-toast'

const VOICES = [
  { id: 'warm-female', label: '따뜻한 여성' },
  { id: 'bright-female', label: '밝은 여성' },
  { id: 'warm-male', label: '따뜻한 남성' },
  { id: 'bright-male', label: '밝은 남성' },
]

export default function VoicePage() {
  const router = useRouter()
  const { project, setVoiceTracks, setSubtitles, setStepStatus } = useStudioStore()
  const [voice, setVoice] = useState('warm-female')
  const [loading, setLoading] = useState(false)
  const scenes = project.scenarioResult ? project.scenarioResult.scenes : []

  async function handleGenerate() {
    setLoading(true)
    try {
      const dialogues = scenes.map(function(s) { return { sceneNumber: s.sceneNumber, text: s.dialogue } })
      const settings = { engine: 'elevenlabs', voiceId: voice, voiceLabel: voice, speed: 1.0, emotion: 'neutral', subtitleStyle: 'white-outline', subtitlePosition: 'bottom' }
      const res = await fetch('/api/backend/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.projectId, dialogues: dialogues, settings: settings })
      })
      const data = await res.json()
      if (data.success) {
        setVoiceTracks(data.data)
        const subRes = await fetch('/api/backend/voice/subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracks: data.data })
        })
        const subData = await subRes.json()
        if (subData.success) { setSubtitles(subData.data) }
        setStepStatus('voice', 'done')
        toast.success('더빙 & 자막 생성 완료!')
      }
    } catch(e) {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-cream-50 rounded-2xl border border-cream-300 p-6 shadow-sm mb-5">
        <h2 className="font-display text-lg text-ink-900 mb-5">🎙️ 더빙 & 자막</h2>
        <div className="mb-5">
          <label className="block text-xs font-medium text-ink-500 mb-2">목소리 선택</label>
          <div className="flex gap-2 flex-wrap">
            {VOICES.map(function(v) {
              return (
                <button key={v.id} onClick={function() { setVoice(v.id) }} className={'px-4 py-2 rounded-full text-sm border transition-all ' + (voice === v.id ? 'bg-forest-100 border-forest-500 text-forest-700 font-medium' : 'border-cream-300 text-ink-500 hover:border-forest-300')}>
                  {v.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-2 mb-6">
          {scenes.map(function(s) {
            return (
              <div key={s.sceneNumber} className="flex items-center gap-3 p-3 bg-cream-100 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center text-sm">🎵</div>
                <div className="flex-1">
                  <div className="text-xs text-ink-400 mb-0.5">장면 {s.sceneNumber}</div>
                  <div className="text-sm text-ink-900">"{s.dialogue}"</div>
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={handleGenerate} disabled={loading} className="w-full py-3 rounded-xl bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 disabled:bg-ink-200 disabled:text-ink-400">
          {loading ? '⏳ 생성 중...' : '✨ AI 더빙 & 자막 생성'}
        </button>
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={function() { router.push('/video') }} className="px-5 py-2.5 rounded-xl border border-cream-300 text-sm text-ink-600 hover:bg-cream-100">← 영상 생성</button>
        <button onClick={function() { router.push('/export') }} className="px-5 py-2.5 rounded-xl bg-forest-600 text-white text-sm font-medium hover:bg-forest-700">내보내기 →</button>
      </div>
    </div>
  )
}
