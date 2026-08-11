import {
    MouseEvent,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState
} from 'react'
import type { MondegreenResponse } from '../../types/mondegreen'
import './Results.css'

const RESULT_BATCH_SIZE = 40
const INTERACTIVE_WORD_LIMIT = 1000
const HOMOPHONE_PICKER_ID = "homophonePicker"
const LONG_RESULT_HOMOPHONE_MARKER = "^"

type ResultsProps = {
    data: MondegreenResponse | null
    isLoading: boolean
    error: string
    onExcludeWord: (word: string) => void
    usesNearHomophones: boolean
}

type SelectedWord = {
    groupId: number
    triggerId: string
    focusTargetId: string
    x: number
    y: number
    placement: "above" | "below"
    maxOptionsHeight: number
}

type CaretDocument = Document & {
    caretPositionFromPoint?: (
        x: number,
        y: number
    ) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
}

function wordAtPoint(
    element: HTMLParagraphElement,
    words: string[],
    x: number,
    y: number
) {
    const caretDocument = document as CaretDocument
    const caretPosition = caretDocument.caretPositionFromPoint?.(x, y)
    const caretRange = caretDocument.caretRangeFromPoint?.(x, y)
    const caretNode = caretPosition?.offsetNode ?? caretRange?.startContainer
    const offset = caretPosition?.offset ?? caretRange?.startOffset
    const fallbackNode = element.firstChild
    const node =
        caretNode?.nodeType === Node.TEXT_NODE && element.contains(caretNode)
            ? caretNode
            : fallbackNode?.nodeType === Node.TEXT_NODE
                ? fallbackNode
                : null

    if (!node) return null

    const ranges: Array<{ wordIndex: number; start: number; end: number }> = []
    let wordStart = 0

    for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
        const wordEnd = wordStart + words[wordIndex].length

        if (wordEnd > wordStart) {
            ranges.push({ wordIndex, start: wordStart, end: wordEnd })
        }

        wordStart = wordEnd + 1
    }

    const caretMatchesText = caretNode === node && offset !== undefined
    const candidateRanges = caretMatchesText
        ? ranges.filter(
            ({ start, end }) => offset >= start && offset <= end
        )
        : []
    const remainingRanges = ranges.filter(
        ({ wordIndex }) =>
            !candidateRanges.some(
                (candidate) => candidate.wordIndex === wordIndex
            )
    )

    for (const { wordIndex, start, end } of [
        ...candidateRanges,
        ...remainingRanges
    ]) {
        const range = document.createRange()
        range.setStart(node, start)
        range.setEnd(node, end)

        for (const bounds of Array.from(range.getClientRects())) {
            if (
                x >= bounds.left &&
                x <= bounds.right &&
                y >= bounds.top &&
                y <= bounds.bottom
            ) {
                return { wordIndex, bounds }
            }
        }
    }

    return null
}

function Results({
    data,
    isLoading,
    error,
    onExcludeWord,
    usesNearHomophones
}: ResultsProps) {
    const [selectedVariants, setSelectedVariants] =
        useState<Record<number, number>>({})
    const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null)
    const [copiedResult, setCopiedResult] = useState<number | null>(null)
    const [showHomophoneHint, setShowHomophoneHint] = useState(false)
    const [selectionAnnouncement, setSelectionAnnouncement] = useState("")
    const [visibleResultCount, setVisibleResultCount] =
        useState(RESULT_BATCH_SIZE)
    const pickerRef = useRef<HTMLElement>(null)
    const mondegreens = data?.mondegreens ?? []
    const homophones = data?.homophones ?? []
    const homophoneLabel = usesNearHomophones ? (
        <>
            <em>near</em> homophone
        </>
    ) : (
        <>homophone</>
    )
    const homophoneAriaLabel = usesNearHomophones
        ? "near homophone"
        : "homophone"
    const totalWordCount = useMemo(
        () =>
            mondegreens.reduce(
                (count, mondegreen) => count + mondegreen.length,
                0
            ),
        [mondegreens]
    )
    const useInteractiveWords = totalWordCount < INTERACTIVE_WORD_LIMIT

    const occurrenceCounts = useMemo(() => {
        const counts: Record<number, number> = {}

        for (const mondegreen of mondegreens) {
            for (const groupId of mondegreen) {
                counts[groupId] = (counts[groupId] ?? 0) + 1
            }
        }

        return counts
    }, [mondegreens])

    function resolveWord(groupId: number) {
        const group = homophones[groupId]
        if (!group?.length) return ""

        return group[selectedVariants[groupId] ?? 0] ?? group[0]
    }

    function resolveResult(mondegreen: number[]) {
        return mondegreen.map(resolveWord).join(" ")
    }

    function resolveLongDisplayWord(groupId: number) {
        const marker =
            (homophones[groupId]?.length ?? 0) > 1
                ? LONG_RESULT_HOMOPHONE_MARKER
                : ""

        return `${resolveWord(groupId)}${marker}`
    }

    function resolveLongDisplayResult(mondegreen: number[]) {
        return mondegreen.map(resolveLongDisplayWord).join(" ")
    }

    useLayoutEffect(() => {
        setVisibleResultCount(RESULT_BATCH_SIZE)
        setSelectedVariants({})
        setSelectedWord(null)
        setCopiedResult(null)
        setSelectionAnnouncement("")
    }, [data])

    useEffect(() => {
        if (mondegreens.length === 0) return

        try {
            if (sessionStorage.getItem("ladymonde-homophone-hint-seen")) return
        } catch {
            // The hint can still work when browser storage is unavailable.
        }

        setShowHomophoneHint(true)
    }, [mondegreens])

    useEffect(() => {
        if (!selectedWord) return

        const focusOption = requestAnimationFrame(() => {
            pickerRef.current
                ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
                ?.focus()
        })

        function closeOnOutsideClick(event: PointerEvent) {
            const target = event.target
            if (
                target instanceof Element &&
                target.closest(
                    ".homophonePicker, .resultWord, .longResultText"
                )
            ) {
                return
            }

            setSelectedWord(null)
        }

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key !== "Escape") return

            const focusTargetId = selectedWord?.focusTargetId
            setSelectedWord(null)
            requestAnimationFrame(() => {
                if (focusTargetId) {
                    document.getElementById(focusTargetId)?.focus()
                }
            })
        }

        function closeOnViewportChange() {
            const restoreFocus = pickerRef.current?.contains(
                document.activeElement
            )
            const focusTargetId = selectedWord?.focusTargetId
            setSelectedWord(null)
            if (restoreFocus) {
                requestAnimationFrame(() => {
                    if (focusTargetId) {
                        document.getElementById(focusTargetId)?.focus()
                    }
                })
            }
        }

        document.addEventListener("pointerdown", closeOnOutsideClick)
        document.addEventListener("keydown", closeOnEscape)
        window.addEventListener("resize", closeOnViewportChange)
        window.addEventListener("scroll", closeOnViewportChange)

        return () => {
            cancelAnimationFrame(focusOption)
            document.removeEventListener("pointerdown", closeOnOutsideClick)
            document.removeEventListener("keydown", closeOnEscape)
            window.removeEventListener("resize", closeOnViewportChange)
            window.removeEventListener("scroll", closeOnViewportChange)
        }
    }, [selectedWord])

    function dismissHomophoneHint() {
        setShowHomophoneHint(false)
        try {
            sessionStorage.setItem("ladymonde-homophone-hint-seen", "true")
        } catch {
            // Dismissing the hint should not depend on browser storage.
        }
    }

    function openWordPicker(
        groupId: number,
        triggerId: string,
        focusTargetId: string,
        bounds: DOMRect
    ) {
        dismissHomophoneHint()

        if (selectedWord?.triggerId === triggerId) {
            setSelectedWord(null)
            return
        }

        const optionCount = homophones[groupId]?.length ?? 0
        const pickerChromeHeight = 124
        const estimatedPickerHeight = Math.min(
            384,
            pickerChromeHeight + optionCount * 38
        )
        const spaceAbove = bounds.top - 20
        const spaceBelow = window.innerHeight - bounds.bottom - 20
        const placement =
            spaceAbove >= estimatedPickerHeight || spaceAbove >= spaceBelow
                ? "above"
                : "below"
        const availableSpace =
            placement === "above" ? spaceAbove : spaceBelow

        setSelectedWord({
            groupId,
            triggerId,
            focusTargetId,
            x: Math.max(
                132,
                Math.min(
                    bounds.left + bounds.width / 2,
                    window.innerWidth - 132
                )
            ),
            y: placement === "above" ? bounds.top : bounds.bottom,
            placement,
            maxOptionsHeight: Math.max(
                48,
                Math.min(260, availableSpace - pickerChromeHeight)
            )
        })
    }

    function selectWord(
        event: MouseEvent<HTMLButtonElement>,
        groupId: number,
        triggerId: string
    ) {
        openWordPicker(
            groupId,
            triggerId,
            triggerId,
            event.currentTarget.getBoundingClientRect()
        )
    }

    function selectLongResultWord(
        event: MouseEvent<HTMLParagraphElement>,
        mondegreen: number[],
        resultIndex: number
    ) {
        if (!window.getSelection()?.isCollapsed) {
            setSelectedWord(null)
            return
        }

        const selected = wordAtPoint(
            event.currentTarget,
            mondegreen.map(resolveLongDisplayWord),
            event.clientX,
            event.clientY
        )

        if (!selected) {
            setSelectedWord(null)
            return
        }

        openWordPicker(
            mondegreen[selected.wordIndex],
            `result-${resultIndex}-word-${selected.wordIndex}`,
            `result-${resultIndex}-text`,
            selected.bounds
        )
    }

    function chooseVariant(groupId: number, variantIndex: number) {
        const variant = homophones[groupId]?.[variantIndex]
        const occurrenceCount = occurrenceCounts[groupId] ?? 0
        const focusTargetId = selectedWord?.focusTargetId

        setSelectedVariants((current) => ({
            ...current,
            [groupId]: variantIndex
        }))
        if (variant) {
            setSelectionAnnouncement(
                `${variant} selected for ${occurrenceCount} ${occurrenceCount === 1 ? "instance" : "instances"
                }.`
            )
        }
        setSelectedWord(null)
        requestAnimationFrame(() => {
            if (focusTargetId) {
                document.getElementById(focusTargetId)?.focus()
            }
        })
    }

    function excludeSelectedWord() {
        if (!selectedWord) return
        const { focusTargetId } = selectedWord
        onExcludeWord(resolveWord(selectedWord.groupId))
        setSelectedWord(null)
        requestAnimationFrame(() => {
            document.getElementById(focusTargetId)?.focus()
        })
    }

    async function copyResult(mondegreen: number[], resultIndex: number) {
        try {
            await navigator.clipboard.writeText(resolveResult(mondegreen))
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

    const selectedGroup = selectedWord
        ? homophones[selectedWord.groupId] ?? []
        : []
    const selectedVariantIndex = selectedWord
        ? selectedVariants[selectedWord.groupId] ?? 0
        : 0
    const selectedDisplayWord = selectedWord
        ? resolveWord(selectedWord.groupId)
        : ""
    const selectedOccurrenceCount = selectedWord
        ? occurrenceCounts[selectedWord.groupId] ?? 0
        : 0
    const responseAnnouncement = isLoading
        ? "Generating results."
        : error
            ? ""
            : data
                ? `${mondegreens.length} ${mondegreens.length === 1 ? "result" : "results"
                } generated.`
                : ""

    return (
        <section className="results" aria-busy={isLoading}>
            <p className="visuallyHidden" role="status">
                {responseAnnouncement}
            </p>
            <p className="visuallyHidden" role="status">
                {selectionAnnouncement}
            </p>

            <div className="resultsHeader">
                <span>results</span>
                <div className="resultsHeaderMeta">
                    {!useInteractiveWords &&
                        homophones.some((group) => group.length > 1) && (
                            <span className="longResultLegend">
                                <strong>{LONG_RESULT_HOMOPHONE_MARKER}</strong>
                                homophone available
                            </span>
                        )}
                    {mondegreens.length > 0 && (
                        <span>
                            {mondegreens.length.toString().padStart(2, "0")}
                        </span>
                    )}
                </div>
            </div>

            {showHomophoneHint && mondegreens.length > 0 && !isLoading && (
                <aside className="exclusionHint" aria-label="Homophone selection tip">
                    <span className="hintIcon" aria-hidden="true">✦</span>
                    <div>
                        <strong>Fine-tune every result</strong>
                        <p>
                            Click any word to choose a {homophoneLabel}. Your choice
                            updates every matching word.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Dismiss homophone selection tip"
                        onClick={dismissHomophoneHint}
                    >
                        ×
                    </button>
                </aside>
            )}

            {selectedWord &&
                selectedGroup.length > 0 &&
                !isLoading &&
                !error && (
                    <aside
                        ref={pickerRef}
                        id={HOMOPHONE_PICKER_ID}
                        className={`homophonePicker ${selectedWord.placement}`}
                        style={{ left: selectedWord.x, top: selectedWord.y }}
                        role="dialog"
                        aria-label={`Choose a ${homophoneAriaLabel} for ${selectedDisplayWord}`}
                    >
                        <div className="homophonePickerHeader">
                            <strong>Choose a {homophoneLabel}</strong>
                            <span>
                                updates {selectedOccurrenceCount}{" "}
                                {selectedOccurrenceCount === 1
                                    ? "instance"
                                    : "instances"}
                            </span>
                        </div>
                        <div
                            className="homophoneOptions"
                            style={{
                                maxHeight: selectedWord.maxOptionsHeight
                            }}
                        >
                            {selectedGroup.map((variant, variantIndex) => (
                                <button
                                    type="button"
                                    aria-pressed={
                                        selectedVariantIndex === variantIndex
                                    }
                                    key={`${variant}-${variantIndex}`}
                                    onClick={() =>
                                        chooseVariant(
                                            selectedWord.groupId,
                                            variantIndex
                                        )
                                    }
                                >
                                    <span>{variant}</span>
                                    {selectedVariantIndex === variantIndex && (
                                        <span aria-hidden="true">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="excludeWordButton"
                            onClick={excludeSelectedWord}
                        >
                            exclude “{selectedDisplayWord}”
                        </button>
                    </aside>
                )}

            {error && (
                <p className="errorMessage" role="alert">
                    {error}
                </p>
            )}

            {!error && mondegreens.length === 0 && !isLoading && (
                <div className="emptyState">
                    <span aria-hidden="true">···</span>
                    <p>Your alternate phrases will appear here</p>
                </div>
            )}

            {isLoading && (
                <div className="loadingState" aria-label="Generating results">
                    <span></span><span></span><span></span>
                </div>
            )}

            {!isLoading && mondegreens.length > 0 && (
                <>
                    <ol className="resultsList">
                        {mondegreens
                            .slice(0, visibleResultCount)
                            .map((mondegreen, resultIndex) => (
                                <li
                                    key={resultIndex}
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
                                        id={`result-${resultIndex}-text`}
                                        className={`resultText ${useInteractiveWords
                                            ? "interactiveWords"
                                            : "longResultText"
                                            }`}
                                        tabIndex={
                                            useInteractiveWords ? undefined : -1
                                        }
                                        aria-haspopup={
                                            useInteractiveWords
                                                ? undefined
                                                : "dialog"
                                        }
                                        aria-expanded={
                                            useInteractiveWords
                                                ? undefined
                                                : selectedWord?.focusTargetId ===
                                                `result-${resultIndex}-text`
                                        }
                                        aria-controls={
                                            !useInteractiveWords &&
                                                selectedWord?.focusTargetId ===
                                                `result-${resultIndex}-text`
                                                ? HOMOPHONE_PICKER_ID
                                                : undefined
                                        }
                                        title={
                                            useInteractiveWords
                                                ? undefined
                                                : `Click a word to choose a ${homophoneAriaLabel}`
                                        }
                                        onClick={
                                            useInteractiveWords
                                                ? undefined
                                                : (event) =>
                                                    selectLongResultWord(
                                                        event,
                                                        mondegreen,
                                                        resultIndex
                                                    )
                                        }
                                    >
                                        {useInteractiveWords
                                            ? mondegreen.map(
                                                (groupId, wordIndex) => {
                                                    const triggerId =
                                                        `result-${resultIndex}-word-${wordIndex}`
                                                    const word =
                                                        resolveWord(groupId)
                                                    const hasHomophones =
                                                        (
                                                            homophones[groupId]
                                                                ?.length ?? 0
                                                        ) > 1

                                                    return (
                                                        <span
                                                            className="resultWordSlot"
                                                            key={triggerId}
                                                        >
                                                            {wordIndex > 0 && " "}
                                                            <button
                                                                id={triggerId}
                                                                type="button"
                                                                className={`resultWord${hasHomophones
                                                                    ? " hasHomophones"
                                                                    : ""
                                                                    }`}
                                                                aria-label={`Choose a ${homophoneAriaLabel} for ${word}`}
                                                                aria-haspopup="dialog"
                                                                aria-expanded={
                                                                    selectedWord?.triggerId ===
                                                                    triggerId
                                                                }
                                                                aria-controls={
                                                                    selectedWord?.triggerId ===
                                                                        triggerId
                                                                        ? HOMOPHONE_PICKER_ID
                                                                        : undefined
                                                                }
                                                                onClick={(event) =>
                                                                    selectWord(
                                                                        event,
                                                                        groupId,
                                                                        triggerId
                                                                    )
                                                                }
                                                            >
                                                                {word}
                                                            </button>
                                                        </span>
                                                    )
                                                }
                                            )
                                            : resolveLongDisplayResult(
                                                mondegreen
                                            )}
                                    </p>
                                    <button
                                        type="button"
                                        className="copyButton"
                                        onClick={() =>
                                            copyResult(mondegreen, resultIndex)
                                        }
                                        aria-label={
                                            copiedResult === resultIndex
                                                ? `Result ${resultIndex + 1} copied`
                                                : `Copy result ${resultIndex + 1}`
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

                    {visibleResultCount < mondegreens.length && (
                        <button
                            type="button"
                            className="showMoreResults"
                            onClick={() =>
                                setVisibleResultCount((current) =>
                                    Math.min(
                                        current + RESULT_BATCH_SIZE,
                                        mondegreens.length
                                    )
                                )
                            }
                        >
                            show {Math.min(
                                RESULT_BATCH_SIZE,
                                mondegreens.length - visibleResultCount
                            )} more
                        </button>
                    )}
                </>
            )}
        </section>
    )
}

export default Results
