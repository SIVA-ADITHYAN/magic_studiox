import { startTransition, useEffect, useState } from 'react'

import CameraEditor from './components/CameraEditor'
import { DEFAULT_CAMERA } from './lib/camera'


const API_BASE = import.meta.env.VITE_API_BASE ?? ''

const DEFAULT_SETTINGS = {
  seed: 0,
  randomizeSeed: true,
  guidanceScale: 1,
  numSteps: 4,
  width: 1024,
  height: 1024,
}

function App() {
  const [camera, setCamera] = useState(DEFAULT_CAMERA)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [sourceFile, setSourceFile] = useState(null)
  const [sourcePreview, setSourcePreview] = useState('')
  const [generatedImage, setGeneratedImage] = useState('')
  const [usedSeed, setUsedSeed] = useState(null)
  const [status, setStatus] = useState('Upload an image and drag the camera bubbles to craft a new angle.')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSizing, setIsSizing] = useState(false)

  useEffect(() => {
    if (!sourceFile) {
      setSourcePreview('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(sourceFile)
    setSourcePreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [sourceFile])

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    startTransition(() => {
      setSourceFile(file)
      setGeneratedImage('')
      setUsedSeed(null)
      setStatus(`Loaded ${file.name}. Fetching recommended output size...`)
    })

    const formData = new FormData()
    formData.append('image', file)

    setIsSizing(true)
    try {
      const response = await fetch(`${API_BASE}/api/dimensions`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Unable to calculate dimensions.')
      }

      const payload = await response.json()
      startTransition(() => {
        setSettings((current) => ({
          ...current,
          width: payload.width,
          height: payload.height,
        }))
        setStatus('Image ready. Adjust the bubbles, then generate a new angle.')
      })
    } catch (error) {
      setStatus(error.message || 'Image loaded, but auto-sizing failed.')
    } finally {
      setIsSizing(false)
    }
  }

  async function handleGenerate(event) {
    event.preventDefault()
    if (!sourceFile) {
      setStatus('Upload an image first so the model has a source to transform.')
      return
    }

    const formData = new FormData()
    formData.append('image', sourceFile)
    formData.append('azimuth', String(camera.azimuth))
    formData.append('elevation', String(camera.elevation))
    formData.append('distance', String(camera.distance))
    formData.append('seed', String(settings.seed))
    formData.append('randomize_seed', String(settings.randomizeSeed))
    formData.append('guidance_scale', String(settings.guidanceScale))
    formData.append('num_steps', String(settings.numSteps))
    formData.append('width', String(settings.width))
    formData.append('height', String(settings.height))

    setIsGenerating(true)
    setStatus('Generating your new camera angle...')

    try {
      const response = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.detail || 'Generation failed.')
      }

      startTransition(() => {
        setGeneratedImage(payload.image.value)
        setUsedSeed(payload.seed)
        setStatus(`Finished. ${payload.camera}`)
      })
    } catch (error) {
      setStatus(error.message || 'Generation failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }))
  }

  return (
    <div className="app-shell">
      <div className="floating-shape floating-shape-circle" aria-hidden="true" />
      <div className="floating-shape floating-shape-squiggle" aria-hidden="true" />
      <div className="floating-shape floating-shape-triangle" aria-hidden="true" />

      <main className="workspace-grid">
        <section className="workspace-main">
          <div className="section-title">
            <span className="section-kicker">Live Editor</span>
            <h2>Compose the angle visually</h2>
          </div>

          <CameraEditor camera={camera} imageSrc={sourcePreview} onChange={setCamera} />

          <div className="preview-grid">
            <article className="sticker-card media-card">
              <div className="card-icon accent-green">IN</div>
              <h3>Source Image</h3>
              {sourcePreview ? (
                <img className="media-frame" src={sourcePreview} alt="Uploaded source" />
              ) : (
                <div className="empty-media">Your uploaded image appears here.</div>
              )}
            </article>

            <article className="sticker-card media-card featured-card">
              <div className="card-icon accent-pink">OUT</div>
              <h3>Generated View</h3>
              {generatedImage ? (
                <img className="media-frame" src={generatedImage} alt="Generated output" />
              ) : (
                <div className="empty-media">The generated perspective will land here.</div>
              )}
            </article>
          </div>
        </section>

        <aside className="workspace-sidebar">
          <form className="controls-stack" onSubmit={handleGenerate}>
            <article className="sticker-card control-card">
              <div className="card-icon accent-violet">1</div>
              <h3>Upload</h3>
              <label className="field">
                <span>Source Image</span>
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </label>
              <p className="field-note">
                {isSizing ? 'Checking the aspect ratio for you...' : 'PNG, JPG, or WEBP all work well.'}
              </p>
            </article>

            <article className="sticker-card control-card">
              <div className="card-icon accent-yellow">2</div>
              <h3>Camera</h3>
              <label className="field">
                <span>Azimuth</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={camera.azimuth}
                  onChange={(event) => setCamera((current) => ({ ...current, azimuth: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Elevation</span>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={camera.elevation}
                  onChange={(event) => setCamera((current) => ({ ...current, elevation: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Distance</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.4"
                  step="0.05"
                  value={camera.distance}
                  onChange={(event) => setCamera((current) => ({ ...current, distance: Number(event.target.value) }))}
                />
              </label>
            </article>

            <article className="sticker-card control-card">
              <div className="card-icon accent-green">3</div>
              <h3>Generation Settings</h3>
              <div className="field-grid">
                <label className="field">
                  <span>Seed</span>
                  <input
                    type="number"
                    value={settings.seed}
                    onChange={(event) => updateSetting('seed', Number(event.target.value))}
                  />
                </label>
                <label className="field field-checkbox">
                  <span>Randomize Seed</span>
                  <input
                    type="checkbox"
                    checked={settings.randomizeSeed}
                    onChange={(event) => updateSetting('randomizeSeed', event.target.checked)}
                  />
                </label>
                <label className="field">
                  <span>Guidance Scale</span>
                  <input
                    type="range"
                    min="0.6"
                    max="3"
                    step="0.1"
                    value={settings.guidanceScale}
                    onChange={(event) => updateSetting('guidanceScale', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>Inference Steps</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={settings.numSteps}
                    onChange={(event) => updateSetting('numSteps', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>Width</span>
                  <input
                    type="number"
                    min="256"
                    max="2048"
                    step="64"
                    value={settings.width}
                    onChange={(event) => updateSetting('width', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>Height</span>
                  <input
                    type="number"
                    min="256"
                    max="2048"
                    step="64"
                    value={settings.height}
                    onChange={(event) => updateSetting('height', Number(event.target.value))}
                  />
                </label>
              </div>
            </article>

            <article className="sticker-card control-card status-card">
              <div className="card-icon accent-pink">4</div>
              <h3>Generate</h3>
              <p className="status-copy">{status}</p>
              {usedSeed !== null ? <p className="status-seed">Used seed: {usedSeed}</p> : null}
              <button className="candy-button" type="submit" disabled={isGenerating}>
                <span>{isGenerating ? 'Generating...' : 'Generate New View'}</span>
                <span className="button-bubble" aria-hidden="true">
                  →
                </span>
              </button>
            </article>
          </form>
        </aside>
      </main>
    </div>
  )
}

export default App
