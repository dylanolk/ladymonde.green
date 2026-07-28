import { useEffect, useState } from 'react'
import './Results.css'

type ResultsProps = {
    items: string[]
    isLoading: boolean
    error: string
    onExcludeWord: (word: string) => void
}

function Results({ items, isLoading, error, onExcludeWord }: ResultsProps) {
    const [selectedToken, setSelectedToken] = useState<string | null>(null)
    const [copiedResult, setCopiedResult] = useState<number | null>(null)
    const [showExclusionHint, setShowExclusionHint] = useState(false)

    useEffect(() => {
        if (items.length === 0) return

        try {
            if (sessionStorage.getItem("ladymonde-exclusion-hint-seen")) return
        } catch {
            // The hint can still work when browser storage is unavailable.
        }

        setShowExclusionHint(true)
    }, [items])

    useEffect(() => {
        if (!selectedToken) return

        function closeOnOutsideClick(event: PointerEvent) {
            const target = event.target
            if (!(target instanceof Element)) return

            const selectedElement = target.closest(
                `[data-token-id="${selectedToken}"]`
            )

            if (!selectedElement) {
                setSelectedToken(null)
            }
        }

        document.addEventListener("pointerdown", closeOnOutsideClick)
        return () => document.removeEventListener("pointerdown", closeOnOutsideClick)
    }, [selectedToken])

    function excludeWord(word: string) {
        onExcludeWord(word)
        setSelectedToken(null)
    }

    function dismissExclusionHint() {
        setShowExclusionHint(false)
        try {
            sessionStorage.setItem("ladymonde-exclusion-hint-seen", "true")
        } catch {
            // Dismissing the hint should not depend on browser storage.
        }
    }

    async function copyResult(result: string, resultIndex: number) {
        try {
            await navigator.clipboard.writeText(result)
            setCopiedResult(resultIndex)
            window.setTimeout(() => {
                setCopiedResult((current) =>
                    current === resultIndex ? null : current
                )
            }, 1400)
        } catch (error) {
            console.error("Could not copy result.", error)
        }
    }

    return (
        <section className="results" aria-live="polite" aria-busy={isLoading}>
            <div className="resultsHeader">
                <span>interpretations</span>
                {items.length > 0 && (
                    <span>{items.length.toString().padStart(2, "0")}</span>
                )}
            </div>

            {showExclusionHint && !isLoading && (
                <aside className="exclusionHint" aria-label="Result word tip">
                    <span className="hintIcon" aria-hidden="true">✦</span>
                    <div>
                        <strong>Fine-tune your results</strong>
                        <p>Don’t like a word? Click it to add it to your exclusions.</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Dismiss result word tip"
                        onClick={dismissExclusionHint}
                    >
                        ×
                    </button>
                </aside>
            )}

            {error && <p className="errorMessage">{error}</p>}

            {!error && items.length === 0 && !isLoading && (
                <div className="emptyState">
                    <span aria-hidden="true">···</span>
                    <p>Your alternate phrases will appear here</p>
                </div>
            )}

            {isLoading && (
                <div className="loadingState" aria-label="Generating interpretations">
                    <span></span><span></span><span></span>
                </div>
            )}

            {!isLoading && items.length > 0 && (
                <ol className="resultsList">
                    {items.map((item, resultIndex) => (
                        <li
                            key={`${item}-${resultIndex}`}
                            style={{ animationDelay: `${resultIndex * 55}ms` }}
                        >
                            <span className="resultNumber">
                                {String(resultIndex + 1).padStart(2, "0")}
                            </span>
                            <p>
                                {item.split(/(\s+)/).map((token, tokenIndex) => {
                                    if (/^\s+$/.test(token)) {
                                        return <span key={tokenIndex}>{token}</span>
                                    }

                                    const tokenId = `${resultIndex}-${tokenIndex}`
                                    const isSelected = selectedToken === tokenId

                                    return (
                                        <span
                                            className="resultToken"
                                            data-token-id={tokenId}
                                            key={tokenIndex}
                                        >
                                            <button
                                                type="button"
                                                className="resultWord"
                                                aria-expanded={isSelected}
                                                onClick={() => {
                                                    dismissExclusionHint()
                                                    setSelectedToken(
                                                        isSelected ? null : tokenId
                                                    )
                                                }}
                                            >
                                                {token}
                                            </button>
                                            {isSelected && (
                                                <span className="wordAction">
                                                    <button
                                                        type="button"
                                                        onClick={() => excludeWord(token)}
                                                    >
                                                        exclude “{token}”
                                                    </button>
                                                </span>
                                            )}
                                        </span>
                                    )
                                })}
                            </p>
                            <button
                                type="button"
                                className="copyButton"
                                onClick={() => copyResult(item, resultIndex)}
                                aria-label={
                                    copiedResult === resultIndex
                                        ? `Interpretation ${resultIndex + 1} copied`
                                        : `Copy interpretation ${resultIndex + 1}`
                                }
                            >
                                {copiedResult === resultIndex ? (
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="m5.5 12.5 4 4 9-9" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <rect x="8" y="8" width="11" height="11" rx="3" />
                                        <path d="M16 8V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h1" />
                                    </svg>
                                )}
                            </button>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    )
}

export default Results
