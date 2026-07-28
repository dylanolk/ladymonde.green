import { useEffect, useState } from 'react'
import './Results.css'

type ResultsProps = {
    items: string[]
    isLoading: boolean
    error: string
    onExcludeWord: (word: string) => void
}

function cleanWord(token: string) {
    return token.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "")
}

function Results({ items, isLoading, error, onExcludeWord }: ResultsProps) {
    const [selectedToken, setSelectedToken] = useState<string | null>(null)

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

    return (
        <section className="results" aria-live="polite" aria-busy={isLoading}>
            <div className="resultsHeader">
                <span>interpretations</span>
                {items.length > 0 && (
                    <span>{items.length.toString().padStart(2, "0")}</span>
                )}
            </div>

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

                                    const word = cleanWord(token)
                                    if (!word) {
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
                                                onClick={() =>
                                                    setSelectedToken(
                                                        isSelected ? null : tokenId
                                                    )
                                                }
                                            >
                                                {token}
                                            </button>
                                            {isSelected && (
                                                <span className="wordAction">
                                                    <button
                                                        type="button"
                                                        onClick={() => excludeWord(word)}
                                                    >
                                                        exclude “{word}”
                                                    </button>
                                                </span>
                                            )}
                                        </span>
                                    )
                                })}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    )
}

export default Results
