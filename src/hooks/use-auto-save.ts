'use client'

import { useRef, useCallback, useState } from 'react'

export function useAutoSave(
  saveFn: () => Promise<void>,
  delay: number = 1500
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const trigger = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setSaveStatus('saving')

    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFn()
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, delay)
  }, [saveFn, delay])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return { trigger, cancel, saveStatus }
}
