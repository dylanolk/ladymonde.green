import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useState } from 'react'
import './Home.css'

const API_URL =
    "https://mondegreen-generator-backend-708250751917.us-east1.run.app/mondegreens_from_phrase"

let warmupStarted = false

function warmBackend() {
    if (warmupStarted) return
    warmupStarted = true

    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ phrase: "" }),
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
                    body: JSON.stringify({ phrase })
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
                </form>

                <section className="results" aria-live="polite" aria-busy={isLoading}>
                    <div className="resultsHeader">
                        <span>interpretations</span>
                        {resultsList.length > 0 && (
                            <span>{resultsList.length.toString().padStart(2, "0")}</span>
                        )}
                    </div>

                    {error && <p className="errorMessage">{error}</p>}

                    {!error && resultsList.length === 0 && !isLoading && (
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

                    {!isLoading && resultsList.length > 0 && (
                        <ol className="resultsList">
                            {resultsList.map((item, index) => (
                                <li
                                    key={`${item}-${index}`}
                                    style={{ animationDelay: `${index * 55}ms` }}
                                >
                                    <span>{String(index + 1).padStart(2, "0")}</span>
                                    <p>{item}</p>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </section>

            <footer>
                <span>mondegreen</span>
                <p>a word or phrase resulting from a mishearing of another</p>
            </footer>
        </main>
    )
}

export default Home
