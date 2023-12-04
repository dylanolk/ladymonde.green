import React, { useState } from 'react'
import './Home.css'
function Home() {
    const [inputVal, setInputVal] = useState("")
    const [resultsList, setResultsList] = useState([])

    function update_results(inputVal: string, callback: Function) {
        fetch(`http://127.0.0.1:5000/mondegreens_from_phrase/${inputVal}`)
            .then(response => response.json())
            .then(json => callback(json))
            .catch(error => console.error(error))
    }
    return (
        <div style={{ height: "100%" }}>
            <div className='homeHeader'>
                <div>
                    <h1>mondeGreenGreen</h1>
                </div>
            </div>
            <div className='homeBody'>
                <form className="flexBox" onSubmit={(e) => {
                    e.preventDefault()
                    update_results(inputVal, setResultsList)
                }}>
                    <div className="mainTextDiv">
                        <input className='mainTextBox'
                            onChange={(e) => {
                                setInputVal(e.target.value);
                            }}
                        >
                        </input>
                    </div>
                    <button type="submit" className="submitButton">SUBMIT</button>
                </form>
                <div className="resultsBox">
                    {resultsList.map((item: string) =>
                        <p>{item}</p>
                    )}
                </div>
            </div>
        </div >
    )
}



export default Home