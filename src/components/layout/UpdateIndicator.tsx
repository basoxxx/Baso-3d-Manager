import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Download, Check } from 'lucide-react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export function UpdateIndicator() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'none'>('idle')
  const [progress, setProgress] = useState(0)
  const [version, setVersion] = useState<string | null>(null)
  const totalRef = useRef(0)
  const downloadedRef = useRef(0)

  useEffect(() => {
    let mounted = true
    // The periodic re-check must not clobber an in-flight download or a
    // "restart to update" prompt.
    const busy = (s: typeof status) => s === 'downloading' || s === 'ready'
    const checkUpdate = async () => {
      setStatus((s) => (busy(s) ? s : 'checking'))
      try {
        const update = await check()
        if (!mounted) return
        if (update) setVersion(update.version)
        setStatus((s) => (busy(s) ? s : update ? 'available' : 'none'))
      } catch (e) {
        console.error('update check failed', e)
        if (mounted) setStatus((s) => (busy(s) ? s : 'none'))
      }
    }
    checkUpdate()
    const interval = setInterval(checkUpdate, 6 * 60 * 60 * 1000) // 6h
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  const handleDownload = async () => {
    setStatus('downloading')
    try {
      const update = await check()
      if (!update) {
        setStatus('none')
        return
      }
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started': {
            setProgress(0)
            downloadedRef.current = 0
            totalRef.current = event.data.contentLength ?? 0
            break
          }
          case 'Progress': {
            // chunkLength is the size of this chunk only, not the running total.
            downloadedRef.current += event.data.chunkLength
            setProgress(totalRef.current ? Math.min(downloadedRef.current / totalRef.current, 1) : 0)
            break
          }
          case 'Finished': setProgress(1); break
        }
      })
      setStatus('ready')
    } catch (e) {
      console.error('download failed', e)
      setStatus('available')
    }
  }

  const handleRelaunch = async () => {
    await relaunch()
  }

  if (status === 'idle' || status === 'checking' || status === 'none') return null

  return (
    <div className="flex items-center gap-2">
      {status === 'available' && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-2.5 py-1 text-xs text-accent hover:bg-accent/20"
        >
          <Download size={12} />
          Aggiorna a v{version}
        </button>
      )}
      {status === 'downloading' && (
        <div className="flex items-center gap-1.5 rounded-md bg-bg-2 px-2.5 py-1 text-xs text-text-2">
          <RefreshCw size={12} className="animate-spin" />
          {Math.round(progress * 100)}%
        </div>
      )}
      {status === 'ready' && (
        <button
          onClick={handleRelaunch}
          className="flex items-center gap-1.5 rounded-md border border-success bg-success/10 px-2.5 py-1 text-xs text-success hover:bg-success/20"
        >
          <Check size={12} />
          Riavvia per aggiornare
        </button>
      )}
    </div>
  )
}
