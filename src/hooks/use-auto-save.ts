'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

export function useAutoSave(
  saveFn: () => Promise<void>,
  delay: number = 1500
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetStatusRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveFnRef = useRef(saveFn)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    saveFnRef.current = saveFn
  }, [saveFn])

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (resetStatusRef.current) {
      clearTimeout(resetStatusRef.current)
      resetStatusRef.current = null
    }
  }, [])

  const runSave = useCallback(async () => {
    clearTimers()
    setSaveStatus('saving')

    try {
      await saveFnRef.current()
      setSaveStatus('saved')
      resetStatusRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('[SalaMap] Auto-save failed:', err)
      setSaveStatus('error')
      // Manter status error por 5s antes de voltar pra idle
      resetStatusRef.current = setTimeout(() => setSaveStatus('idle'), 5000)
    }
  }, [clearTimers])

  const trigger = useCallback(() => {
    clearTimers()
    setSaveStatus('saving')

    timeoutRef.current = setTimeout(() => {
      void runSave()
    }, delay)
  }, [clearTimers, delay, runSave])

  const cancel = useCallback(() => {
    clearTimers()
    setSaveStatus('idle')
  }, [clearTimers])

  const flush = useCallback(async () => {
    await runSave()
  }, [runSave])

  useEffect(() => cancel, [cancel])

  return { trigger, cancel, flush, saveStatus }
}
