'use client'
import { useRouter } from 'next/navigation'
import { useStudioStore } from '@/lib/store'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ExportPage() {
  const router = useRouter()
  const { project, setExports } = useStudioStore()
  const [loading, setLoading] = useState(false)

  const handleCompose = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/backend/export/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.projectId,
          clips: project.videoClips || [],
          tracks: project.voiceTracks || [],
          subtitles: project.subtitles || [],
          voiceSettings: project.voiceSettings || { subtitleStyle: 'white-outline', subtitlePosition: 'bottom' }
        })
      })
      const data = await res.json()
      if (data.success) {
        setExports(data.data)
        toast.success('영상 합성 완료!')
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
        <h2 className="font-display text-lg text-ink-900 mb-5">📦 최종 내보내기</h2>

        <div className="bg-cream-100 rounded-xl p-4 mb-6 space-y-2">
          {[
            { label: '시나리오', done: !!project.scenarioResult },
            { label: '캐릭터', done: !!project.character },
            { label: '스토리보드', done: !!project.storyboard },
            { label: '영상 생성', done: !!project.videoClips },
            { label: '더빙 & 자막', done: !!project.voiceTracks },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span className={item.done ? 'text-forest-500' : 'text-ink-300'}>{item.done ? '✅' : '○'}</span>
              <span className={item.done ? 'text-ink-900' : 'text-ink-400'}>{item.label}</span>
            </div>
          ))}
        </div>

        {project.exports && project.exports.length > 0 ? (
          <div className="space-y-3">
            {project.exports.map(asset => (
              <div key={asset.assetId} className="flex items-center gap-3 p-3 bg-white border border-cream-300 rounded-xl">
                <div className="text-2xl">🎬</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink-900">{asset.label}</div>
                  <div className="text-xs text-ink-400">{asset.filename}</div>
                </div>
                {asset.downloadUrl && (
                  <a href={asset.downloadUrl} download
                    className="px-3 py-1.5 rounded-lg bg-forest-600 text-white text-xs font-medium hover:bg-forest-700">
                    다운로드
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <button onClick={handleCompose} disabled={loading}
            className="w-full py-3 rounded-xl bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 disabled:bg-ink-200 disabled:text-ink-400">
            {loading ? '⏳ 합성 중...' : '🎬 최종 영상 합성하기'}
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={() => router.push('/voice')} className="px-5 py-2.5 rounded-xl border border-cream-300 text-sm text-ink-600 hover:bg-cream-100">← 더빙 & 자막</button>
      </div>
    </div>
  )
}
