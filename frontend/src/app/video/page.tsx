'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useStudioStore } from '@/lib/store'

export default function VideoPage() {
  const router = useRouter()
  const { project, setVideoClips, setStepStatus } = useStudioStore()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const scenes = project.scenarioResult ? project.scenarioResult.scenes : []

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/backend/video/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.projectId,
          frames: project.storyboard || [],
          character: project.character || { lockedPrompt: '', negativePrompt: '', name: '' },
          settings: { resolution: '1080p', fps: 24, transition: 'fade', bgMusic: null }
        })
      })
      const data = await res.json()
      if (data.success) {
        setVideoClips(data.data.clips)
        setStepStatus('video', 'done')
        setDone(true)
      }
    } catch(e) {
      alert('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{maxWidth: '600px', margin: '0 auto', padding: '24px'}}>
      <div style={{background: 'white', borderRadius: '16px', border: '1px solid #e8dfc2', padding: '24px', marginBottom: '16px'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px'}}>
          <h2 style={{fontSize: '20px', fontWeight: '600'}}>🎥 영상 생성</h2>
          <span style={{background: '#faeeda', color: '#633806', padding: '4px 10px', borderRadius: '999px', fontSize: '12px'}}>Kling AI</span>
        </div>
        <div style={{marginBottom: '20px'}}>
          {scenes.map(function(s) {
            return (
              <div key={s.sceneNumber} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f9f6ee', borderRadius: '12px', marginBottom: '8px'}}>
                <div style={{fontSize: '24px'}}>🎬</div>
                <div>
                  <div style={{fontWeight: '500', fontSize: '14px'}}>장면 {s.sceneNumber} · {s.timeRange}</div>
                  <div style={{color: '#787878', fontSize: '12px'}}>{s.description.slice(0, 50)}...</div>
                </div>
                <div style={{marginLeft: 'auto', fontSize: '12px', color: done ? '#127545' : '#787878'}}>{done ? '✅ 완료' : '대기 중'}</div>
              </div>
            )
          })}
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || done}
          style={{width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: done ? '#aee4c5' : loading ? '#b8b8b8' : '#127545', color: 'white', fontSize: '15px', fontWeight: '600', cursor: loading || done ? 'not-allowed' : 'pointer'}}>
          {done ? '✅ 생성 완료!' : loading ? '⏳ 영상 생성 중... (2~5분 소요)' : '✨ AI 영상 생성 시작'}
        </button>
        {loading && <p style={{textAlign: 'center', color: '#787878', fontSize: '12px', marginTop: '8px'}}>Kling AI가 영상을 만들고 있어요. 잠시 기다려주세요!</p>}
      </div>
      <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
        <button onClick={function() { router.push('/storyboard') }} style={{padding: '10px 20px', borderRadius: '12px', border: '1px solid #e8dfc2', background: 'white', cursor: 'pointer', fontSize: '14px'}}>← 스토리보드</button>
        <button onClick={function() { router.push('/voice') }} style={{padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#127545', color: 'white', cursor: 'pointer', fontSize: '14px'}}>더빙 & 자막 →</button>
      </div>
    </div>
  )
}
