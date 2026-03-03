'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Header from './Header'
import FrequencyCatalog from './FrequencyCatalog'
import { FrequencyPreset, freqToSlider, sliderToFreq, freqToColor } from '@/lib/frequencies'

// Dynamically import Three.js visualizer to avoid SSR issues
const ThreeVisualizer = dynamic(() => import('./ThreeVisualizer'), { ssr: false })

interface Layer {
  id: number
  frequency: number
  wave: OscillatorType
  volume: number
  active: boolean
  label: string
  binauralBeat?: number
}

interface FrequencyStudioProps {
  user: { email: string; id: string }
}

const WAVE_TYPES: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth']
const WAVE_LABELS: Record<OscillatorType, string> = {
  sine: 'Sine', triangle: 'Triangle', square: 'Square', sawtooth: 'Saw',
  custom: 'Custom',
}

export default function FrequencyStudio({ user }: FrequencyStudioProps) {
  // ── UI State ──────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false)
  const [masterVolume, setMasterVolume] = useState(0.6)
  const [is8D, setIs8D] = useState(false)
  const [rotationSpeed, setRotationSpeed] = useState(0.5)
  const [layers, setLayers] = useState<Layer[]>([
    { id: 1, frequency: 432, wave: 'sine', volume: 0.8, active: true, label: 'Layer 1' },
  ])
  const [activeLayerId, setActiveLayerId] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileTab, setMobileTab] = useState<'controls' | 'catalog' | 'layers'>('controls')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Audio Refs ────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const pannerRef = useRef<PannerNode | null>(null)
  const oscNodesRef = useRef<Map<number, { osc: OscillatorNode; gain: GainNode; oscR?: OscillatorNode; panL?: StereoPannerNode; panR?: StereoPannerNode }>>(new Map())
  const raf8DRef = useRef<number>(0)
  const rotationAngleRef = useRef<number>(0)

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0]

  // ── Build Audio Graph ─────────────────────────────────────
  const buildAudioGraph = useCallback(() => {
    const ctx = audioCtxRef.current!
    masterGainRef.current = ctx.createGain()
    masterGainRef.current.gain.value = masterVolume

    analyserRef.current = ctx.createAnalyser()
    analyserRef.current.fftSize = 2048
    analyserRef.current.smoothingTimeConstant = 0.8

    if (is8D) {
      pannerRef.current = ctx.createPanner()
      pannerRef.current.panningModel = 'HRTF'
      pannerRef.current.distanceModel = 'inverse'
      pannerRef.current.refDistance = 1
      pannerRef.current.maxDistance = 10
      masterGainRef.current
        .connect(pannerRef.current)
        .connect(analyserRef.current)
        .connect(ctx.destination)
    } else {
      pannerRef.current = null
      masterGainRef.current.connect(analyserRef.current).connect(ctx.destination)
    }
  }, [is8D, masterVolume])

  // ── Start oscillator for a layer ──────────────────────────
  const startLayer = useCallback((layer: Layer) => {
    if (!audioCtxRef.current || !masterGainRef.current) return
    const ctx = audioCtxRef.current

    // Stop existing node for this layer
    const existing = oscNodesRef.current.get(layer.id)
    if (existing) {
      try { existing.osc.stop() } catch {}
      try { existing.oscR?.stop() } catch {}
      oscNodesRef.current.delete(layer.id)
    }

    if (!layer.active) return

    const layerGain = ctx.createGain()
    layerGain.gain.value = layer.volume

    if (layer.binauralBeat) {
      // True binaural: left ear = carrier, right ear = carrier + beat
      const oscL = ctx.createOscillator()
      const oscR = ctx.createOscillator()
      oscL.type = layer.wave
      oscR.type = layer.wave
      oscL.frequency.value = layer.frequency
      oscR.frequency.value = layer.frequency + layer.binauralBeat

      const panL = ctx.createStereoPanner()
      const panR = ctx.createStereoPanner()
      panL.pan.value = -1
      panR.pan.value = 1

      oscL.connect(panL).connect(layerGain)
      oscR.connect(panR).connect(layerGain)
      layerGain.connect(masterGainRef.current)

      oscL.start()
      oscR.start()
      oscNodesRef.current.set(layer.id, { osc: oscL, gain: layerGain, oscR, panL, panR })
    } else {
      const osc = ctx.createOscillator()
      osc.type = layer.wave
      osc.frequency.value = layer.frequency
      osc.connect(layerGain).connect(masterGainRef.current)
      osc.start()
      oscNodesRef.current.set(layer.id, { osc, gain: layerGain })
    }
  }, [])

  // ── 8D rotation animation ─────────────────────────────────
  const start8DRotation = useCallback(() => {
    const rotate = () => {
      if (!pannerRef.current || !audioCtxRef.current) return
      rotationAngleRef.current += rotationSpeed * 0.02
      const angle = rotationAngleRef.current
      const radius = 5
      pannerRef.current.positionX.value = Math.sin(angle) * radius
      pannerRef.current.positionZ.value = Math.cos(angle) * radius
      raf8DRef.current = requestAnimationFrame(rotate)
    }
    cancelAnimationFrame(raf8DRef.current)
    raf8DRef.current = requestAnimationFrame(rotate)
  }, [rotationSpeed])

  // ── Play ──────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (isPlaying) return

    // Create AudioContext on user gesture (browser requirement)
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume()
    }

    buildAudioGraph()

    layers.forEach((layer) => startLayer(layer))

    if (is8D) start8DRotation()

    setIsPlaying(true)
  }, [isPlaying, layers, buildAudioGraph, startLayer, is8D, start8DRotation])

  // ── Stop ──────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    cancelAnimationFrame(raf8DRef.current)

    oscNodesRef.current.forEach(({ osc, oscR }) => {
      try { osc.stop() } catch {}
      try { oscR?.stop() } catch {}
    })
    oscNodesRef.current.clear()

    if (masterGainRef.current) {
      masterGainRef.current.disconnect()
      masterGainRef.current = null
    }
    analyserRef.current = null
    pannerRef.current = null

    setIsPlaying(false)
  }, [])

  // ── Live-update frequency while playing ───────────────────
  const updateOscFrequency = useCallback((layerId: number, freq: number) => {
    const node = oscNodesRef.current.get(layerId)
    if (!node) return
    node.osc.frequency.setTargetAtTime(freq, audioCtxRef.current!.currentTime, 0.01)
    if (node.oscR) {
      const layer = layers.find((l) => l.id === layerId)
      const beat = layer?.binauralBeat ?? 0
      node.oscR.frequency.setTargetAtTime(freq + beat, audioCtxRef.current!.currentTime, 0.01)
    }
  }, [layers])

  const updateOscVolume = useCallback((layerId: number, vol: number) => {
    const node = oscNodesRef.current.get(layerId)
    if (!node) return
    node.gain.gain.setTargetAtTime(vol, audioCtxRef.current!.currentTime, 0.01)
  }, [])

  // ── Layer controls ────────────────────────────────────────
  const updateLayer = useCallback((id: number, changes: Partial<Layer>) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, ...changes } : l))
  }, [])

  const handleFreqChange = useCallback((val: number) => {
    const freq = sliderToFreq(val)
    updateLayer(activeLayerId, { frequency: freq })
    if (isPlaying) updateOscFrequency(activeLayerId, freq)
  }, [activeLayerId, updateLayer, isPlaying, updateOscFrequency])

  const handleVolumeChange = useCallback((vol: number) => {
    updateLayer(activeLayerId, { volume: vol })
    if (isPlaying) updateOscVolume(activeLayerId, vol)
  }, [activeLayerId, updateLayer, isPlaying, updateOscVolume])

  const handleWaveChange = useCallback((wave: OscillatorType) => {
    updateLayer(activeLayerId, { wave })
    if (isPlaying) {
      const node = oscNodesRef.current.get(activeLayerId)
      if (node) node.osc.type = wave
    }
  }, [activeLayerId, updateLayer, isPlaying])

  const handleMasterVolume = useCallback((vol: number) => {
    setMasterVolume(vol)
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(vol, audioCtxRef.current!.currentTime, 0.01)
    }
  }, [])

  const addLayer = useCallback(() => {
    if (layers.length >= 3) return
    const newId = Date.now()
    const newLayer: Layer = {
      id: newId, frequency: 528, wave: 'sine', volume: 0.5,
      active: true, label: `Layer ${layers.length + 1}`,
    }
    setLayers((prev) => [...prev, newLayer])
    setActiveLayerId(newId)
    if (isPlaying) startLayer(newLayer)
  }, [layers, isPlaying, startLayer])

  const removeLayer = useCallback((id: number) => {
    if (layers.length <= 1) return
    if (isPlaying) {
      const node = oscNodesRef.current.get(id)
      if (node) { try { node.osc.stop() } catch {} try { node.oscR?.stop() } catch {} }
      oscNodesRef.current.delete(id)
    }
    setLayers((prev) => prev.filter((l) => l.id !== id))
    if (activeLayerId === id) setActiveLayerId(layers.find((l) => l.id !== id)!.id)
  }, [layers, isPlaying, activeLayerId])

  // ── Catalog preset selection ──────────────────────────────
  const handlePresetSelect = useCallback((preset: FrequencyPreset) => {
    const changes: Partial<Layer> = {
      frequency: preset.frequency,
      wave: preset.wave,
      binauralBeat: preset.binauralBeat,
    }
    updateLayer(activeLayerId, changes)
    if (isPlaying) {
      updateOscFrequency(activeLayerId, preset.frequency)
    }
  }, [activeLayerId, updateLayer, isPlaying, updateOscFrequency])

  // ── Update 8D rotation speed live ────────────────────────
  useEffect(() => {
    if (!isPlaying || !is8D) return
    cancelAnimationFrame(raf8DRef.current)
    start8DRotation()
  }, [rotationSpeed, isPlaying, is8D, start8DRotation])

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      handleStop()
      audioCtxRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accentColor = freqToColor(activeLayer.frequency)

  // ── Shared sub-components ─────────────────────────────────
  const LayersList = () => (
    <>
      {layers.map((layer) => {
        const color = freqToColor(layer.frequency)
        const isActive = layer.id === activeLayerId
        return (
          <div
            key={layer.id}
            onClick={() => setActiveLayerId(layer.id)}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              border: `1px solid ${isActive ? color + '60' : 'rgba(255,255,255,0.07)'}`,
              background: isActive ? `${color}12` : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? color : 'var(--text-primary)' }}>
                {layer.label}
              </span>
              {layers.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeLayer(layer.id) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, padding: '0 2px' }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
              {layer.frequency} Hz · {layer.wave}
            </div>
            {layer.binauralBeat && (
              <div style={{ marginTop: 2, fontSize: 11, color: '#a78bfa' }}>
                Binaural +{layer.binauralBeat} Hz
              </div>
            )}
            <div style={{ marginTop: 6, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ width: `${layer.volume * 100}%`, height: '100%', background: color, transition: 'width 0.1s' }} />
            </div>
          </div>
        )
      })}
      {layers.length < 3 && (
        <button
          onClick={addLayer}
          style={{
            padding: '10px',
            borderRadius: 8,
            border: '1px dashed rgba(255,255,255,0.15)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          + Add Layer
        </button>
      )}
    </>
  )

  const ControlsPanel = ({ compact }: { compact?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 16 : 14 }}>
      {/* Frequency */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1 }}>FREQUENCY</span>
          <span style={{ fontSize: compact ? 20 : 18, fontWeight: 700, color: accentColor, fontVariantNumeric: 'tabular-nums' }}>
            {activeLayer.frequency} Hz
          </span>
        </div>
        <input
          type="range" min={0} max={1000}
          value={freqToSlider(activeLayer.frequency)}
          onChange={(e) => handleFreqChange(Number(e.target.value))}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>20 Hz</span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>20,000 Hz</span>
        </div>
      </div>

      {/* Waveform */}
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 8 }}>WAVEFORM</p>
        <div style={{ display: 'flex', gap: 6 }}>
          {WAVE_TYPES.map((w) => (
            <button
              key={w}
              onClick={() => handleWaveChange(w)}
              style={{
                flex: 1,
                padding: compact ? '8px 4px' : '5px 10px',
                borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${activeLayer.wave === w ? accentColor : 'rgba(255,255,255,0.1)'}`,
                background: activeLayer.wave === w ? `${accentColor}20` : 'transparent',
                color: activeLayer.wave === w ? accentColor : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {WAVE_LABELS[w]}
            </button>
          ))}
        </div>
      </div>

      {/* Volumes */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1 }}>LAYER VOL</span>
            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{Math.round(activeLayer.volume * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={activeLayer.volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1 }}>MASTER</span>
            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{Math.round(masterVolume * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={masterVolume}
            onChange={(e) => handleMasterVolume(Number(e.target.value))} />
        </div>
      </div>

      {/* 8D */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px',
        background: is8D ? 'rgba(236,72,153,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${is8D ? 'rgba(236,72,153,0.25)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 10, transition: 'all 0.3s',
      }}>
        <button
          onClick={() => {
            const next = !is8D
            setIs8D(next)
            if (isPlaying) { handleStop(); setTimeout(handlePlay, 100) }
          }}
          style={{
            padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: 'none', flexShrink: 0,
            background: is8D ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'rgba(255,255,255,0.07)',
            color: is8D ? 'white' : 'var(--text-secondary)', transition: 'all 0.2s',
          }}
        >
          8D {is8D ? 'ON' : 'OFF'}
        </button>
        <div style={{ flex: 1, opacity: is8D ? 1 : 0.4, transition: 'opacity 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1 }}>ROTATION</span>
            <span style={{ fontSize: 12, color: '#f472b6' }}>{rotationSpeed.toFixed(1)}x</span>
          </div>
          <input type="range" min={0.1} max={3} step={0.1} value={rotationSpeed}
            disabled={!is8D} onChange={(e) => setRotationSpeed(Number(e.target.value))} />
        </div>
      </div>
    </div>
  )

  // ── Mobile Layout ─────────────────────────────────────────
  if (isMobile) {
    const TAB_ITEMS = [
      { id: 'controls' as const, label: 'Controls', icon: '🎛' },
      { id: 'catalog' as const, label: 'Catalog', icon: '🎵' },
      { id: 'layers' as const, label: 'Layers', icon: '◧' },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
        {/* Header */}
        <Header email={user.email} isPlaying={isPlaying} activeFrequency={activeLayer.frequency} />

        {/* 3D Visualizer — always visible, the hero */}
        <div style={{ height: '38vh', flexShrink: 0, position: 'relative' }}>
          <ThreeVisualizer
            analyserRef={analyserRef}
            isPlaying={isPlaying}
            frequency={activeLayer.frequency}
            volume={activeLayer.volume}
            is8D={is8D}
            rotationAngleRef={rotationAngleRef}
            onFrequencyChange={(freq) => {
              updateLayer(activeLayerId, { frequency: freq })
              if (isPlaying) updateOscFrequency(activeLayerId, freq)
            }}
            onVolumeChange={(vol) => handleVolumeChange(vol)}
          />
        </div>

        {/* Play bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '10px 16px',
          background: 'rgba(5,5,20,0.98)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <button
            onClick={isPlaying ? handleStop : handlePlay}
            className={isPlaying ? 'pulse-playing' : ''}
            style={{
              width: 56, height: 56, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: isPlaying
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              color: 'white', fontSize: 22, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isPlaying ? '◼' : '▶'}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1 }}>FREQUENCY</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: accentColor, fontVariantNumeric: 'tabular-nums' }}>
                {activeLayer.frequency} Hz
              </span>
            </div>
            <input
              type="range" min={0} max={1000}
              value={freqToSlider(activeLayer.frequency)}
              onChange={(e) => handleFreqChange(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', paddingBottom: 4 }}>
          {mobileTab === 'controls' && <ControlsPanel compact />}
          {mobileTab === 'catalog' && (
            <FrequencyCatalog onSelect={handlePresetSelect} activeFrequency={activeLayer.frequency} mobile />
          )}
          {mobileTab === 'layers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 4 }}>SOUND LAYERS</p>
              <LayersList />
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <div style={{
          display: 'flex',
          background: 'rgba(5,5,20,0.98)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {TAB_ITEMS.map((tab) => {
            const active = mobileTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '10px 4px 8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  borderTop: `2px solid ${active ? '#00d4ff' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 18 }}>{tab.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#00d4ff' : 'var(--text-secondary)' }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Desktop Layout ────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      <Header email={user.email} isPlaying={isPlaying} activeFrequency={activeLayer.frequency} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Catalog */}
        <FrequencyCatalog onSelect={handlePresetSelect} activeFrequency={activeLayer.frequency} />

        {/* Center: Visualizer + Controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 3D Visualizer */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <ThreeVisualizer
              analyserRef={analyserRef}
              isPlaying={isPlaying}
              frequency={activeLayer.frequency}
              volume={activeLayer.volume}
              is8D={is8D}
              rotationAngleRef={rotationAngleRef}
              onFrequencyChange={(freq) => {
                updateLayer(activeLayerId, { frequency: freq })
                if (isPlaying) updateOscFrequency(activeLayerId, freq)
              }}
              onVolumeChange={(vol) => handleVolumeChange(vol)}
            />
          </div>

          {/* Controls panel */}
          <div style={{
            padding: '16px 20px',
            background: 'rgba(5, 5, 20, 0.95)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            {/* Play / Stop + Frequency display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={isPlaying ? handleStop : handlePlay}
                className={isPlaying ? 'pulse-playing' : ''}
                style={{
                  width: 52, height: 52, borderRadius: '50%', border: 'none',
                  background: isPlaying
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
                  color: 'white', fontSize: 20, cursor: 'pointer',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.1s',
                }}
              >
                {isPlaying ? '◼' : '▶'}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1 }}>FREQUENCY</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: accentColor, fontVariantNumeric: 'tabular-nums' }}>
                    {activeLayer.frequency} Hz
                  </span>
                </div>
                <input
                  type="range" min={0} max={1000}
                  value={freqToSlider(activeLayer.frequency)}
                  onChange={(e) => handleFreqChange(Number(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>20 Hz</span>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>20,000 Hz</span>
                </div>
              </div>
            </div>

            <ControlsPanel />
          </div>
        </div>

        {/* Right: Layers panel */}
        <div style={{
          width: 180, flexShrink: 0,
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
          display: 'flex', flexDirection: 'column',
          padding: 12, gap: 8,
        }}>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 4 }}>
            SOUND LAYERS
          </p>
          <LayersList />
          <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 6 }}>ACTIVE FREQ</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: accentColor }}>{activeLayer.frequency}</p>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Hz · {activeLayer.wave}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
