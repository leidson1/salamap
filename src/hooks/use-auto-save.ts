'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

export function useAutoSave(
  saveFn: () => Promise<void>,
  delay: number = 1500,
  onError?: (msg: string) => void
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetStatusRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveFnRef = useRef(saveFn)
  const onErrorRef = useRef(onError)
  const inFlightRef = useRef<Promise<void> | null>(null)
  const pendingSaveRef = useRef(false)
  const unmountedRef = useRef(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    saveFnRef.current = saveFn
  }, [saveFn])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

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

  const finishAsSaved = useCallback(() => {
    if (unmountedRef.current) return
    setSaveStatus('saved')
    resetStatusRef.current = setTimeout(() => {
      if (!unmountedRef.current) {
        setSaveStatus('idle')
      }
    }, 2000)
  }, [])

  const runSave = useCallback(() => {
    if (inFlightRef.current) {
      return inFlightRef.current
    }

    clearTimers()
    if (!unmountedRef.current) {
      setSaveStatus('saving')
    }

    const promise = (async () => {
      try {
        while (pendingSaveRef.current) {
          pendingSaveRef.current = false
          await saveFnRef.current()
        }
        finishAsSaved()
      } catch (err) {
        pendingSaveRef.current = false
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error('[SalaMap] Auto-save failed:', msg, err)
        if (!unmountedRef.current) {
          setSaveStatus('error')
        }
        onErrorRef.current?.(msg)
        resetStatusRef.current = setTimeout(() => {
          if (!unmountedRef.current) {
            setSaveStatus('idle')
          }
        }, 5000)
        throw err
      } finally {
        inFlightRef.current = null
      }
    })()

    inFlightRef.current = promise
    return promise
  }, [clearTimers, finishAsSaved])

  const trigger = useCallback(() => {
    clearTimers()
    pendingSaveRef.current = true
    if (!unmountedRef.current) {
      setSaveStatus('saving')
    }

    timeoutRef.current = setTimeout(() => {
      void runSave()
    }, delay)
  }, [clearTimers, delay, runSave])

  const cancel = useCallback(() => {
    clearTimers()
    pendingSaveRef.current = false
    if (!unmountedRef.current) {
      setSaveStatus('idle')
    }
  }, [clearTimers])

  const flush = useCallback(async () => {
    pendingSaveRef.current = true
    await runSave()
  }, [runSave])

  useEffect(() => {
    return () => {
      unmountedRef.current = true
      cancel()
    }
  }, [cancel])

  return { trigger, cancel, flush, saveStatus }
}
