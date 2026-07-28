import { MouseEvent, useEffect, useMemo, useState } from 'react'
import './Results.css'

const RESULT_BATCH_SIZE = 40
const INTERACTIVE_WORD_LIMIT = 1000

type ResultsProps = {
    items: string[]
    isLoading: boolean
    error: string
    onExcludeWord: (word: string) => void
}

type SelectedWord = {
    word: string
    x: number
    y: number
    id?: string
}

type CaretDocument = Document & {
    caretPositionFromPoint?: (
        x: number,
        y: number
    ) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
}

function wordAtPoint(x: number, y: number) {
    const caretDocument = document as CaretDocument
    const caretPosition = caretDocument.caretPositionFromPoint?.(x, y)
    const caretRange = caretDocument.caretRangeFromPoint?.(x, y)
    const node = caretPosition?.offsetNode ?? caretRange?.startContainer
    let offset = caretPosition?.offset ?? caretRange?.startOffset

    if (!node || offset === undefined || node.nodeType !== Node.TEXT_NODE) {
        return null
    }

    const text = node.textContent ?? ""
    if (offset === text.length) offset -= 1
    if (offset < 0 || /\s/.test(text[offset])) return null

    let start = offset
    let end = offset + 1

    while (start > 0 && !/\s/.test(text[start - 1])) start -= 1
    while (end < text.length && !/\s/.test(text[end])) end += 1

    return text.slice(start, end)
}

function Results({ items, isLoading, error, onExcludeWord }: ResultsProps) {
    const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null)
    const [copiedResult, setCopiedResult] = useState<number | null>(null)
    const [showExclusionHint, setShowExclusionHint] = useState(false)
    const [visibleResultCount, setVisibleResultCount] =
        useState(RESULT_BATCH_SIZE)
    const totalWordCount = useMemo(
        () =>
            items.reduce(
                (count, item) => count + (item.match(/\S+/g)?.length ?? 0),
                0
            ),
        [items]
    )
    const useInteractiveWords = totalWordCount < INTERACTIVE_WORD_LIMIT

    useEffect(() => {
        setVisibleResultCount(RESULT_BATCH_SIZE)
        setSelectedWord(null)
    }, [items])

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
        if (!selectedWord) return

        function closeOnOutsideClick(event: PointerEvent) {
            const target = event.target
            if (
                target instanceof Element &&
                target.closest(".resultWordAction")
            ) {
                return
            }

            setSelectedWord(null)
        }

        document.addEventListener("pointerdown", closeOnOutsideClick)
        return () => document.removeEventListener("pointerdown", closeOnOutsideClick)
    }, [selectedWord])

    function dismissExclusionHint() {
        setShowExclusionHint(false)
        try {
            sessionStorage.setItem("ladymonde-exclusion-hint-seen", "true")
        } catch {
            // Dismissing the hint should not depend on browser storage.
        }
    }

    function selectWord(event: MouseEvent<HTMLParagraphElement>) {
        if (!window.getSelection()?.isCollapsed) return

        const word = wordAtPoint(event.clientX, event.clientY)
        if (!word) return

        dismissExclusionHint()
        setSelectedWord({
            word,
            x: Math.max(90, Math.min(event.clientX, window.innerWidth - 90)),
            y: event.clientY - 8
        })
    }

    function selectInteractiveWord(
        event: MouseEvent<HTMLButtonElement>,
        word: string,
        id: string
    ) {
        dismissExclusionHint()
        const bounds = event.currentTarget.getBoundingClientRect()

        setSelectedWord((current) =>
            current?.id === id
                ? null
                : {
                    word,
                    id,
                    x: Math.max(
                        90,
                        Math.min(
                            bounds.left + bounds.width / 2,
                            window.innerWidth - 90
                        )
                    ),
                    y: bounds.top
                }
        )
    }

    function excludeSelectedWord() {
        if (!selectedWord) return
        onExcludeWord(selectedWord.word)
        setSelectedWord(null)
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
        } catch (copyError) {
            console.error("Could not copy result.", copyError)
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

            {selectedWord && (
                <aside
                    className="resultWordAction"
                    style={{ left: selectedWord.x, top: selectedWord.y }}
                >
                    <button type="button" onClick={excludeSelectedWord}>
                        exclude “{selectedWord.word}”
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
                <>
                    <ol className="resultsList">
                        {items
                            .slice(0, visibleResultCount)
                            .map((item, resultIndex) => (
                                <li
                                    key={`${item}-${resultIndex}`}
                                    style={{
                                        animationDelay: `${Math.min(
                                            resultIndex % RESULT_BATCH_SIZE,
                                            10
                                        ) * 35}ms`
                                    }}
                                >
                                    <span className="resultNumber">
                                        {String(resultIndex + 1).padStart(2, "0")}
                                    </span>
                                    <p
                                        className={`resultText${
                                            useInteractiveWords
                                                ? " interactiveWords"
                                                : ""
                                        }`}
                                        onClick={
                                            useInteractiveWords
                                                ? undefined
                                                : selectWord
                                        }
                                        title="Click a word to exclude it"
                                    >
                                        {useInteractiveWords
                                            ? item
                                                .split(/(\s+)/)
                                                .map((token, tokenIndex) => {
                                                    if (/^\s+$/.test(token)) {
                                                        return (
                                                            <span key={tokenIndex}>
                                                                {token}
                                                            </span>
                                                        )
                                                    }

                                                    const tokenId =
                                                        `${resultIndex}-${tokenIndex}`

                                                    return (
                                                        <button
                                                            type="button"
                                                            className="resultWord"
                                                            aria-expanded={
                                                                selectedWord?.id ===
                                                                tokenId
                                                            }
                                                            key={tokenIndex}
                                                            onClick={(event) =>
                                                                selectInteractiveWord(
                                                                    event,
                                                                    token,
                                                                    tokenId
                                                                )
                                                            }
                                                        >
                                                            {token}
                                                        </button>
                                                    )
                                                })
                                            : item}
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

                    {visibleResultCount < items.length && (
                        <button
                            type="button"
                            className="showMoreResults"
                            onClick={() =>
                                setVisibleResultCount((current) =>
                                    Math.min(current + RESULT_BATCH_SIZE, items.length)
                                )
                            }
                        >
                            show {Math.min(
                                RESULT_BATCH_SIZE,
                                items.length - visibleResultCount
                            )} more
                        </button>
                    )}
                </>
            )}
        </section>
    )
}

export default Results
