import {
    ChangeEvent,
    FormEvent,
    KeyboardEvent,
    useEffect,
    useRef,
    useState
} from 'react'
import FeatureSettings, {
    createDefaultFeatures
} from '../../components/FeatureSettings/FeatureSettings'
import Results from '../../components/Results/Results'
import type {
    FeaturesParams,
    MondegreenRequest,
    MondegreenResponse
} from '../../types/mondegreen'
import './Home.css'

const API_URL = import.meta.env.DEV
    ? "/api/mondegreens_from_phrase"
    : "https://mondegreen-generator-backend-708250751917.us-east1.run.app/mondegreens_from_phrase"

function createRequest(
    phrase: string,
    featuresParams: FeaturesParams = {},
    includeWords = "",
    excludeWords = "",
    wordCommonality = 0.4
): MondegreenRequest {
    const splitWords = (words: string) =>
        words.trim() ? words.trim().split(/\s+/) : []

    return {
        phrase,
        settings: {
            exclude_words: splitWords(excludeWords),
            include_words: splitWords(includeWords),
            minimum_word_commonality: wordCommonality,
            features_params: featuresParams
        }
    }
}

function isMondegreenResponse(value: unknown): value is MondegreenResponse {
    if (!value || typeof value !== "object") return false

    const response = value as Partial<MondegreenResponse>
    const { mondegreens, homophones } = response
    if (
        !Array.isArray(mondegreens) ||
        !Array.isArray(homophones)
    ) {
        return false
    }

    const homophonesAreValid = homophones.every(
        (group) =>
            Array.isArray(group) &&
            group.length > 0 &&
            group.every((word) => typeof word === "string")
    )

    return (
        homophonesAreValid &&
        mondegreens.every(
            (mondegreen) =>
                Array.isArray(mondegreen) &&
                mondegreen.every(
                    (groupId) =>
                        Number.isInteger(groupId) &&
                        groupId >= 0 &&
                        groupId < homophones.length
                )
        )
    )
}

function Home() {
    const [inputVal, setInputVal] = useState("")
    const [results, setResults] = useState<MondegreenResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isWarmingUp, setIsWarmingUp] = useState(true)
    const [error, setError] = useState("")
    const [featuresParams, setFeaturesParams] =
        useState<FeaturesParams>(() => createDefaultFeatures())
    const [includeWords, setIncludeWords] = useState("")
    const [excludeWords, setExcludeWords] = useState("")
    const [wordCommonality, setWordCommonality] = useState(0.4)
    const [settingsAttention, setSettingsAttention] = useState(0)
    const lastWarmedFeatures = useRef<string | null>(null)
    const warmupRequestId = useRef(0)

    useEffect(() => {
        const serializedFeatures = JSON.stringify(featuresParams)

        if (serializedFeatures === lastWarmedFeatures.current) return

        const controller = new AbortController()
        const sendWarmup = async () => {
            lastWarmedFeatures.current = serializedFeatures
            const requestId = ++warmupRequestId.current

            try {
                await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                        createRequest("asdf", featuresParams)
                    ),
                    signal: controller.signal,
                    keepalive: true
                })
            } catch (error) {
                if (
                    requestId === warmupRequestId.current &&
                    !(error instanceof DOMException && error.name === "AbortError")
                ) {
                    console.debug("Backend warm-up request did not complete.", error)
                }
            } finally {
                if (requestId === warmupRequestId.current) {
                    setIsWarmingUp(false)
                }
            }
        }

        const timeout = window.setTimeout(sendWarmup, 400)
        const interval = window.setInterval(sendWarmup, 60_000)

        return () => {
            window.clearTimeout(timeout)
            window.clearInterval(interval)
            controller.abort()
            setIsWarmingUp(false)
        }
    }, [featuresParams])

    async function generateMondegreens(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const phrase = inputVal.trim()

        if (!phrase || isLoading) return

        setIsLoading(true)
        setError("")
        setResults(null)

        try {
            const response = await fetch(
                API_URL,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                        createRequest(
                            phrase,
                            featuresParams,
                            includeWords,
                            excludeWords,
                            wordCommonality
                        )
                    )
                }
            )

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`)
            }

            const responseBody: unknown = await response.json()
            if (!isMondegreenResponse(responseBody)) {
                throw new Error("The server returned an unexpected response.")
            }

            setResults(responseBody)
        } catch (requestError) {
            console.error(requestError)
            setError("Something got lost in translation. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    function updatePhrase(event: ChangeEvent<HTMLTextAreaElement>) {
        setInputVal(event.target.value)
        event.target.style.height = "auto"
        event.target.style.height = `${event.target.scrollHeight}px`
    }

    function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
        }
    }

    function addExcludedWord(word: string) {
        const words = excludeWords.trim() ? excludeWords.trim().split(/\s+/) : []
        const alreadyExcluded = words.some(
            (existingWord) =>
                existingWord.toLocaleLowerCase() === word.toLocaleLowerCase()
        )

        if (alreadyExcluded) return

        setExcludeWords([...words, word].join(" "))
        setSettingsAttention((current) => current + 1)
    }

    return (
        <>
            {isWarmingUp && (
                <div className="warmupOverlay" role="status" aria-live="polite">
                    <div className="warmupMessage">
                        <span className="warmupSpinner" aria-hidden="true" />
                        <p>ladymonde.green is starting up, this may take 20 seconds</p>
                    </div>
                </div>
            )}

            <main className="home">
            <header className="siteHeader">
                <a className="wordmark" href="/" aria-label="ladymonde.green home">
                    <span className="wordmarkMark" aria-hidden="true">
                        <span>L</span>
                    </span>
                    <span>ladymonde<span>.green</span></span>
                </a>
            </header>

            <section className="generator" aria-label="Mondegreen generator">
                <form className="generatorForm" onSubmit={generateMondegreens}>
                    <label className="visuallyHidden" htmlFor="phrase">your phrase</label>
                    <div className="inputRow">
                        <textarea
                            id="phrase"
                            className={`phraseInput${inputVal ? " hasValue" : ""}`}
                            value={inputVal}
                            rows={1}
                            autoComplete="off"
                            autoFocus
                            placeholder="type a phrase..."
                            onChange={updatePhrase}
                            onKeyDown={submitOnEnter}
                        />
                        <button
                            type="submit"
                            className="submitButton"
                            disabled={!inputVal.trim() || isLoading}
                        >
                            {isLoading ? "processing..." : "generate"}
                            <span aria-hidden="true">❧</span>
                        </button>
                    </div>

                    <FeatureSettings
                        value={featuresParams}
                        onChange={setFeaturesParams}
                        includeWords={includeWords}
                        excludeWords={excludeWords}
                        onIncludeWordsChange={setIncludeWords}
                        onExcludeWordsChange={setExcludeWords}
                        wordCommonality={wordCommonality}
                        onWordCommonalityChange={setWordCommonality}
                        attentionSignal={settingsAttention}
                    />
                </form>

                <Results
                    data={results}
                    isLoading={isLoading}
                    error={error}
                    onExcludeWord={addExcludedWord}
                />
            </section>

            <footer>
            </footer>
            </main>
        </>
    )
}

export default Home
