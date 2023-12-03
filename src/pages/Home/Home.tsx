import React, { useState } from 'react'
import './Home.css'
function Home() {
    const [inputVal, setInputVal] = useState("")
    const [resultsList, setResultsList] = useState([])
    return (
        <div style={{ height: "100%" }}>
            <div className='homeHeader'>
                <div>
                    <h1>mondeGreenGreen</h1>
                </div>
            </div>
            <div className='homeBody'>
                <div className="flexBox">
                    <div className="mainTextDiv">
                        <input className='mainTextBox'
                            onChange={(e) => {
                                setInputVal(e.target.value);
                            }}
                        >
                        </input>
                    </div>
                    <button className="submitButton" onClick={() => {
                        update_results(inputVal, setResultsList)
                    }}>SUBMIT</button>
                </div>
                <div className="resultsBox">
                    {resultsList.map((item: string) =>
                        <p>{item}</p>
                    )}
                </div>
            </div>
        </div >
    )
}

function update_results(inputVal: string, callback: Function) {
    fetch(`http://127.0.0.1:5000/mondegreens_from_phrase/${inputVal}`)
        .then(response => response.json())
        .then(json => callback(json))
        .catch(error => console.error(error))
}

export default Home