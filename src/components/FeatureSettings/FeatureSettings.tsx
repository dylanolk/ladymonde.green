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
    { key: "bleed_t_d", label: "T / D bleed" },
    { key: "bleed_ch_j", label: "CH / J bleed" }
]

const INITIAL_FEATURES: FeaturesParams = {
    h_dropping: false,
    consonant_reduction: false,
    bleed_plosives: false,
    bleed_gutterals: false,
    bleed_s_z: false,
    bleed_vowels: false,
    bleed_t_d: false,
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
    attentionSignal: number
}

function FeatureSettings({
    value,
    onChange,
    includeWords,
    excludeWords,
    onIncludeWordsChange,
    onExcludeWordsChange,
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

    return (
        <details
            ref={detailsRef}
            className={`featureSettings${needsAttention ? " needsAttention" : ""}`}
        >
            <summary>
                <span>settings</span>
                <span>
                    {enabledCount} enabled
                    <span className="settingsChevron" aria-hidden="true">+</span>
                </span>
            </summary>

            <div className="wordFilters">
                <label>
                    <span>include words</span>
                    <input
                        type="text"
                        value={includeWords}
                        placeholder="word another"
                        autoComplete="off"
                        onChange={(event) => onIncludeWordsChange(event.target.value)}
                    />
                </label>
                <label>
                    <span>exclude words</span>
                    <input
                        type="text"
                        value={excludeWords}
                        placeholder="word another"
                        autoComplete="off"
                        onChange={(event) => onExcludeWordsChange(event.target.value)}
                    />
                </label>
                <p>Separate words with spaces.</p>
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
        </details>
    )
}

export default FeatureSettings
