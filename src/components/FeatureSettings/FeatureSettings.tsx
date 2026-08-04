import { useEffect, useRef, useState } from 'react'
import type { FeaturesParams } from '../../types/mondegreen'
import './FeatureSettings.css'

const FEATURE_OPTIONS: Array<{ key: keyof FeaturesParams; label: string }> = [
    { key: "h_dropping", label: "H-dropping" },
    { key: "consonant_reduction", label: "Consonant reduction" },
    { key: "bleed_plosives", label: "Plosive bleed" },
    { key: "bleed_gutterals", label: "Guttural bleed" },
    { key: "bleed_s_z", label: "S / Z bleed" },
    { key: "bleed_vowels", label: "Vowel bleed" },
    { key: "bleed_unstressed_vowels", label: "Unstressed vowel bleed" },
    { key: "bleed_t_d", label: "T / D bleed" },
    { key: "bleed_dh_t", label: "DH / T bleed" },
    { key: "bleed_ch_j", label: "CH / J bleed" }
]

const INITIAL_FEATURES: FeaturesParams = {
    h_dropping: false,
    consonant_reduction: false,
    bleed_plosives: false,
    bleed_gutterals: false,
    bleed_s_z: false,
    bleed_vowels: false,
    bleed_unstressed_vowels: false,
    bleed_t_d: false,
    bleed_dh_t: false,
    bleed_ch_j: false
}

export function createDefaultFeatures(enabled?: boolean): FeaturesParams {
    if (enabled === undefined) {
        return { ...INITIAL_FEATURES }
    }

    return Object.fromEntries(
        FEATURE_OPTIONS.map(({ key }) => [key, enabled])
    ) as FeaturesParams
}

type FeatureSettingsProps = {
    value: FeaturesParams
    onChange: (value: FeaturesParams) => void
    includeWords: string
    excludeWords: string
    onIncludeWordsChange: (value: string) => void
    onExcludeWordsChange: (value: string) => void
    wordCommonality: number
    onWordCommonalityChange: (value: number) => void
    attentionSignal: number
}

function FeatureSettings({
    value,
    onChange,
    includeWords,
    excludeWords,
    onIncludeWordsChange,
    onExcludeWordsChange,
    wordCommonality,
    onWordCommonalityChange,
    attentionSignal
}: FeatureSettingsProps) {
    const detailsRef = useRef<HTMLDetailsElement>(null)
    const [needsAttention, setNeedsAttention] = useState(false)
    const enabledCount = Object.values(value).filter(Boolean).length
    const allEnabled = enabledCount === FEATURE_OPTIONS.length

    useEffect(() => {
        if (attentionSignal === 0 || detailsRef.current?.open) return

        setNeedsAttention(false)
        const frame = requestAnimationFrame(() => setNeedsAttention(true))
        const timeout = window.setTimeout(() => setNeedsAttention(false), 900)

        return () => {
            cancelAnimationFrame(frame)
            window.clearTimeout(timeout)
        }
    }, [attentionSignal])

    function toggleFeature(feature: keyof FeaturesParams) {
        onChange({
            ...value,
            [feature]: !value[feature]
        })
    }

    function toggleAll() {
        onChange(createDefaultFeatures(!allEnabled))
    }

    function closeSettings() {
        if (detailsRef.current) {
            detailsRef.current.open = false
        }
    }

    return (
        <details
            ref={detailsRef}
            className={`featureSettings${needsAttention ? " needsAttention" : ""}`}
        >
            <summary aria-label="Open settings">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" />
                    <path d="M19.1 13.8a7.8 7.8 0 0 0 .05-3.37l1.55-1.2-1.8-3.1-1.82.74a7.7 7.7 0 0 0-2.92-1.7L13.9 3.2h-3.6l-.27 1.97a7.7 7.7 0 0 0-2.92 1.7l-1.82-.74-1.8 3.1 1.56 1.2a7.8 7.8 0 0 0 .04 3.37l-1.6 1.24 1.8 3.1 1.9-.78a7.8 7.8 0 0 0 2.84 1.64l.27 2h3.6l.27-2a7.8 7.8 0 0 0 2.84-1.64l1.9.78 1.8-3.1-1.6-1.24Z" />
                </svg>
                {enabledCount > 0 && (
                    <span className="settingsCount">{enabledCount}</span>
                )}
            </summary>

            <div className="settingsPanel">
                <div className="settingsPanelHeader">
                    <div>
                        <span>generator</span>
                        <h2>Settings</h2>
                    </div>
                    <button
                        type="button"
                        aria-label="Close settings"
                        onClick={closeSettings}
                    >
                        ×
                    </button>
                </div>

                <div className="wordFilters">
                    <label>
                        <span>include words</span>
                        <input
                            type="text"
                            value={includeWords}
                            autoComplete="off"
                            onChange={(event) => onIncludeWordsChange(event.target.value)}
                        />
                    </label>
                    <label>
                        <span>exclude words</span>
                        <input
                            type="text"
                            value={excludeWords}
                            autoComplete="off"
                            onChange={(event) => onExcludeWordsChange(event.target.value)}
                        />
                    </label>
                    <p>Separate words with spaces.</p>
                </div>

                <div className="commonalityControl">
                    <div className="commonalityHeader">
                        <label htmlFor="wordCommonality">word commonality</label>
                        <button
                            type="button"
                            disabled={wordCommonality === 0.5}
                            onClick={() => onWordCommonalityChange(0.5)}
                        >
                            reset
                        </button>
                    </div>
                    <input
                        id="wordCommonality"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={wordCommonality}
                        onChange={(event) =>
                            onWordCommonalityChange(Number(event.target.value))
                        }
                    />
                    <div className="commonalityLabels" aria-hidden="true">
                        <span>use less common words</span>
                        <span>excluded uncommon words</span>
                    </div>
                </div>

                <div className="settingsActions">
                    <span>phonetic features</span>
                    <button type="button" onClick={toggleAll}>
                        {allEnabled ? "deselect all" : "select all"}
                    </button>
                </div>

                <div className="featureGrid">
                    {FEATURE_OPTIONS.map(({ key, label }) => (
                        <label className="featureToggle" key={key}>
                            <span>{label}</span>
                            <input
                                type="checkbox"
                                checked={Boolean(value[key])}
                                onChange={() => toggleFeature(key)}
                            />
                            <span className="toggleTrack" aria-hidden="true">
                                <span></span>
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        </details>
    )
}

export default FeatureSettings
