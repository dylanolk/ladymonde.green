import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useState } from 'react'
import FeatureSettings, {
    createDefaultFeatures
} from '../../components/FeatureSettings/FeatureSettings'
import Results from '../../components/Results/Results'
import type { FeaturesParams, MondegreenRequest } from '../../types/mondegreen'
import './Home.css'

const API_URL = import.meta.env.DEV
    ? "/api/mondegreens_from_phrase"
    : "https://mondegreen-generator-backend-708250751917.us-east1.run.app/mondegreens_from_phrase"

function createRequest(
    phrase: string,
    featuresParams: FeaturesParams = {},
    includeWords = "",
    excludeWords = ""
): MondegreenRequest {
    const splitWords = (words: string) =>
        words.trim() ? words.trim().split(/\s+/) : []

    return {
        phrase,
        settings: {
            exclude_words: splitWords(excludeWords),
            include_words: splitWords(includeWords),
            features_params: featuresParams
        }
    }
}

let warmupStarted = false

function warmBackend() {
    if (warmupStarted) return
    warmupStarted = true

    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createRequest("")),
        keepalive: true
    }).catch((error) => {
        console.debug("Backend warm-up request did not complete.", error)
    })
}

function Home() {
    const [inputVal, setInputVal] = useState("")
    const [resultsList, setResultsList] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [featuresParams, setFeaturesParams] =
        useState<FeaturesParams>(() => createDefaultFeatures())
    const [includeWords, setIncludeWords] = useState("")
    const [excludeWords, setExcludeWords] = useState("")
    const [settingsAttention, setSettingsAttention] = useState(0)

    useEffect(() => {
        warmBackend()
    }, [])

    async function generateMondegreens(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const phrase = inputVal.trim()

        if (!phrase || isLoading) return

        setIsLoading(true)
        setError("")

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
                            excludeWords
                        )
                    )
                }
            )

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`)
            }

            setResultsList(await response.json())
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
                        attentionSignal={settingsAttention}
                    />
                </form>

                <Results
                    items={resultsList}
                    isLoading={isLoading}
                    error={error}
                    onExcludeWord={addExcludedWord}
                />
            </section>

            <footer>
                <span>mondegreen</span>
                <p>a word or phrase resulting from a mishearing of another</p>
            </footer>
        </main>
    )
}

export default Home
