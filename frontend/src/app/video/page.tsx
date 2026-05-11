'use client'
import { useRouter } from 'next/navigation'

export default function VideoPage() {
  const router = useRouter()
  return (
    <div style={{padding: '40px', textAlign: 'center'}}>
      <h2 style={{fontSize: '24px', marginBottom: '20px'}}>🎥 영상 생성</h2>
      <p style={{color: '#666', marginBottom: '30px'}}>Kling AI로 영상을 생성합니다</p>
      <button
        onClick={() => router.push('/voice')}
        style={{background: '#127545', color: 'white', padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px'}}>
        더빙 & 자막 →
      </button>
    </div>
  )
}
