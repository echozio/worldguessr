import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic";
import { FaMap } from "react-icons/fa";
import useWindowDimensions from "./useWindowDimensions";
import EndBanner from "./endBanner";
import calcPoints from "./calcPoints";
import findCountry from "./findCountry";
import BannerText from "./bannerText";
import PlayerList from "./playerList";
import { FaExpand, FaMinimize, FaThumbtack } from "react-icons/fa6";
import { useTranslation } from 'next-i18next'
import CountryBtns from "./countryButtons";
import OnboardingText from "./onboardingText";
import ClueBanner from "./clueBanner";
import ExplanationModal from "./explanationModal";
import SaveStreakBanner from "./streakSaveBanner";
import { toast } from "react-toastify";
import sendEvent from "./utils/sendEvent";
import fixBranding from "./utils/fixBranding";
import gameStorage from "./utils/localStorage";
import RoundOverScreen from "./roundOverScreen";

const MapWidget = dynamic(() => import("../components/Map"), { ssr: false });

export default function GameUI({ singlePlayerRound, setSinglePlayerRound, showDiscordModal, setShowDiscordModal, inCrazyGames, showPanoOnResult, setShowPanoOnResult, countryGuesserCorrect, setCountryGuesserCorrect, otherOptions, onboarding, setOnboarding, countryGuesser, options, timeOffset, ws, multiplayerState, backBtnPressed, setMultiplayerState, countryStreak, setCountryStreak, loading, setLoading, session, gameOptionsModalShown, setGameOptionsModalShown, latLong, streetViewShown, setStreetViewShown, loadLocation, gameOptions, setGameOptions, showAnswer, setShowAnswer, pinPoint, setPinPoint, hintShown, setHintShown, xpEarned, setXpEarned, showCountryButtons, setShowCountryButtons }) {
  const { t: text } = useTranslation("common");

  function loadLocationFuncRaw() {
    if(onboarding) {
      if(onboarding.round === 5) {
        setOnboarding((prev)=>{
          return {
          completed: true,
          points: prev.points,
          timeTaken: Date.now() - prev.startTime
          }
        })
        setShowAnswer(false)
        setStreetViewShown(false)
      } else {
      setOnboarding((prev) => {
        return {
          ...prev,
          round: prev.round + 1,
          nextRoundTime: 0
        }
      })
    }
    } else if(singlePlayerRound && singlePlayerRound.round === singlePlayerRound.totalRounds && !singlePlayerRound?.done) {


      // display the results
      setShowAnswer(false)
        setStreetViewShown(false)

        setSinglePlayerRound((prev) => {
          return {
            ...prev,
            done: true
          }
        })

    } else {


      loadLocation()

      if(singlePlayerRound && !singlePlayerRound?.done) {
        setSinglePlayerRound((prev) => {
          return {
            ...prev,
            round: prev.round + 1
          }
        })
      } else {
        // reset to default
        setSinglePlayerRound({
          round: 1,
          totalRounds: 5,
          locations: []
        })
      }
    }

  }

  function loadLocationFunc() {
      loadLocationFuncRaw()
  }

  const { width, height } = useWindowDimensions();
  // how to determine if touch screen?
  let isTouchScreen = false;
  if(window.matchMedia("(pointer: coarse)").matches) {
    isTouchScreen = true;
  }

  const [miniMapShown, setMiniMapShown] = useState(false)
  const [miniMapExpanded, setMiniMapExpanded] = useState(false)
  const [miniMapFullscreen, setMiniMapFullscreen] = useState(false)
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [lostCountryStreak, setLostCountryStreak] = useState(0);
  const [timeToNextMultiplayerEvt, setTimeToNextMultiplayerEvt] = useState(0);
  const [timeToNextRound, setTimeToNextRound] = useState(0); //only for onboarding
  const [mapPinned, setMapPinned] = useState(false);
  // dist between guess & target
  const [km, setKm] = useState(null);
  const [onboardingTextShown, setOnboardingTextShown] = useState(false);
  const [onboardingWords, setOnboardingWords] = useState([]);
  const [explanationModalShown, setExplanationModalShown] = useState(false);

  const [explanations, setExplanations] = useState([]);
  const [showClueBanner, setShowClueBanner] = useState(false);
  useEffect(() => {
    if(showAnswer) {
      setShowPanoOnResult(false)
    } else {
    }
  }, [showAnswer])



  useEffect(() => {

    const interval = setInterval(() => {
    if(multiplayerState?.inGame && multiplayerState?.gameData?.nextEvtTime) {
      setTimeToNextMultiplayerEvt(Math.max(0,Math.floor(((multiplayerState.gameData.nextEvtTime - Date.now()) - timeOffset) / 100)/10))
    }
    }, 100)

    return () => {
      clearInterval(interval)
    }
  }, [multiplayerState, timeOffset])

  useEffect(() => {
    // fetch clue (if any)
    setExplanations([])

    // only if learn mode
    if(window.location.search.includes("learn=true")) {

      console.log("fetching clue")
    fetch('/api/clues/getClue'+(latLong ? `?lat=${latLong.lat}&lng=${latLong.long}` : '')).then(res => res.json()).then(data => {

      if(data.error) {
        console.error(data.error);
        return;
      }
      if(data.length === 0 ||  data.message) return;
      setShowClueBanner(true);
      setExplanations(data)
    });
  }

  }, [latLong]);

  useEffect(() => {
    if(onboarding?.nextRoundTime) {
      const interval = setInterval(() => {
      const val = Math.max(0,Math.floor(((onboarding.nextRoundTime - Date.now())) / 100)/10)
        setTimeToNextRound(val)

        if(val === 0) {
          setOnboarding((prev) => {
            return {
              ...prev,
              nextRoundTime: Date.now() + 20000
            }
          });
          setOnboardingWords([
            text("onboardingTimeEnd")
          ])
          setOnboardingTextShown(true);
        }
      }, 100)

      return () => {
        clearInterval(interval)
      }
    }
  }, [onboarding?.nextRoundTime])

  useEffect(() => {
    if(multiplayerState?.inGame) return;
    if (!latLong) {
      setLoading(true)
      setStreetViewShown(false)
    } else {
      setRoundStartTime(Date.now());
      setXpEarned(0);
    }
  }, [latLong, multiplayerState])

  useEffect(() => {
    try {
    gameStorage.setItem("countryStreak", countryStreak);
    } catch(e) {
      console.log("error setting countryStreak in localstorage")
    }
  }, [countryStreak])

  useEffect(() => {
    if(onboarding) {
      setOnboardingTextShown(true);
      if( onboarding.round === 1) {
        setOnboardingWords([
        text("welcomeToWorldguessr")+"!",
        text("onboarding2"),
        text("onboarding3"),
        text("onboarding4"),
      ])
    } else if(onboarding.round === 2) {
      setOnboardingWords([
        text("greatJob"),
        text("onboarding5"),
      ])
    } else if(onboarding.round === 3) {
      setOnboardingWords([
        text("astounding"),
      ])
    } else if(onboarding.round === 4) {
      setOnboardingWords([
        text("onboarding10")
      ])
    } else if(onboarding.round === 5) {
      setOnboardingWords([
        text("finalRound"),
      ])
    }
  }
  }, [onboarding?.round])


  useEffect(() => {
    function keydown(e) {

      if(explanationModalShown) return;
      if(singlePlayerRound?.done) {
        loadLocationFunc()
        return;
      }
      if(pinPoint && e.key === ' ' && !showAnswer) {
        guess();
      } else if(showAnswer && e.key === ' ') {
        loadLocationFunc()
      }
    }
    // on space key press, guess
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
    }
  }, [pinPoint, showAnswer, onboarding, xpEarned, explanationModalShown, singlePlayerRound])

  useEffect(() => {
    if (!loading && latLong && width > 600 && !isTouchScreen) {
      setMiniMapShown(true)
    } else {
      setMiniMapShown(false)
    }
  }, [loading, latLong, width])

  function showHint() {
    setHintShown(true)
  }
  useEffect(() => {
    loadLocation()
    if(singlePlayerRound) {
      setSinglePlayerRound({
        round: 1,
        totalRounds: 5,
        locations: []
      })
    }
  }, [gameOptions?.location])
  function guess() {
    setShowAnswer(true)
    if(showCountryButtons || setShowCountryButtons)setShowCountryButtons(false);
    if(onboarding) {
      setOnboarding((prev) => {

        return {
          ...prev,
          nextRoundTime:0,
          points: (prev.points??0) + (countryGuesser?2500:calcPoints({ lat: latLong.lat, lon: latLong.long, guessLat: pinPoint.lat, guessLon: pinPoint.lng, usedHint: hintShown, maxDist: 20000}))
        }
      })
      setTimeToNextRound(0)
    }

    if(singlePlayerRound) {
      setSinglePlayerRound((prev) => {
        return {
          ...prev,
          locations: [...prev.locations, {lat: latLong.lat, long: latLong.long, guessLat: pinPoint.lat, guessLong: pinPoint.lng,
            points: calcPoints({ lat: latLong.lat, lon: latLong.long, guessLat: pinPoint.lat, guessLon: pinPoint.lng, usedHint: hintShown, maxDist: gameOptions.maxDist })

          }],
          lastPoint: calcPoints({ lat: latLong.lat, lon: latLong.long, guessLat: pinPoint.lat, guessLon: pinPoint.lng, usedHint: hintShown, maxDist: gameOptions.maxDist })
        }
      })
    }

    if(multiplayerState?.inGame) return;

    if(xpEarned > 0 && session?.token?.secret && gameOptions.official) {
      fetch('/api/storeGame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          secret: session.token.secret,
          lat: pinPoint.lat,
          long: pinPoint.lng,
          usedHint: hintShown,
          actualLat: latLong.lat,
          actualLong: latLong.long,
          maxDist: gameOptions.maxDist,
          roundTime: Math.round((Date.now() - roundStartTime)/ 1000)
        })
      }).then(res => res.json()).then(data => {
        if(data.error) {
          console.error(data.error);
          return;
        }
      }).catch(e => {
        console.error(e);
      });
    }

    if(gameOptions.location === 'all' && pinPoint) {

      function afterGuess(country) {
        setLostCountryStreak(0);
        if(country === latLong.country) {
          setCountryStreak(countryStreak + 1);
        } else if(country !== "Unknown") {
          setCountryStreak(0);
          setLostCountryStreak(countryStreak);

        }
      }
    findCountry({ lat: pinPoint.lat, lon: pinPoint.lng }).then((country) => {
      afterGuess(country)

    }).catch((e) => {
      console.error(e);
      afterGuess("Unknown")
    });
    }
  }

  useEffect(() => {
    if(!latLong || !pinPoint || multiplayerState?.inGame || !gameOptions?.official) return;
    setXpEarned(Math.round(calcPoints({ lat: latLong.lat, lon: latLong.long, guessLat: pinPoint.lat, guessLon: pinPoint.lng, usedHint: hintShown, maxDist: gameOptions.maxDist }) / 50))
  }, [km, latLong, pinPoint])


  useEffect(() => {
    const int= setInterval(() => {
      fixBranding();
    },500)
    return () => {
      clearInterval(int)
    }
  },[])




  const multiplayerTimerShown = !((loading||showAnswer||!multiplayerState||(multiplayerState?.gameData?.state === 'getready' && multiplayerState?.gameData?.curRound === 1)||multiplayerState?.gameData?.state === 'end'));
  const onboardingTimerShown = !((loading||showAnswer||!onboarding));
  return (
    <div className="gameUI">

{ !onboarding && !inCrazyGames && (
    <div className={`topAdFixed ${(multiplayerTimerShown || onboardingTimerShown || singlePlayerRound)?'moreDown':''}`}>
    </div>
)}

{/*


',

*/}


{ singlePlayerRound?.done && (
<RoundOverScreen points={singlePlayerRound.locations.reduce((acc, cur) => acc + cur.points, 0)

} maxPoints={25000}
history={singlePlayerRound.locations}
buttonText={text("playAgain")}
onHomePress={() =>{
  loadLocationFunc()
              }}/>
)}
      {(!countryGuesser || (countryGuesser && showAnswer)) && (!multiplayerState || (multiplayerState.inGame && ['guess', 'getready'].includes(multiplayerState.gameData?.state))) && ((multiplayerState?.inGame && multiplayerState?.gameData?.curRound === 1) ? multiplayerState?.gameData?.state === "guess" : true ) && (
        <>


      <div id="miniMapArea" onMouseEnter={() => {
        setMiniMapExpanded(true)
      }} onMouseLeave={() => {
        if(mapPinned) return;
        // todo: if mouse down, don't collapse
        setMiniMapExpanded(false)
      }} className={`miniMap ${miniMapExpanded ? 'mapExpanded' : ''} ${(miniMapShown||showAnswer)&&(!singlePlayerRound?.done && ((!showPanoOnResult && showAnswer) || (!showAnswer))) ? 'shown' : ''} ${showAnswer ? 'answerShown' : 'answerNotShown'} ${miniMapFullscreen&&miniMapExpanded ? 'fullscreen' : ''}`}>

{!showAnswer && (
<div className="mapCornerBtns desktop" style={{ visibility: miniMapExpanded ? 'visible' : 'hidden' }}>
          <button className="cornerBtn" onClick={() => {
            setMiniMapFullscreen(!miniMapFullscreen)
            if(!miniMapFullscreen) {
              setMiniMapExpanded(true)
            }
          }}>{miniMapFullscreen  ? (
            <FaMinimize />
          ) : (
            <FaExpand />
          )}</button>
          <button className="cornerBtn" onClick={() => {
            setMapPinned(!mapPinned)
          }}>
            <FaThumbtack style={{ transform: mapPinned ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>
)}
        <MapWidget shown={latLong && !loading} focused={miniMapExpanded} options={options} ws={ws} gameOptions={gameOptions} answerShown={showAnswer} session={session} showHint={hintShown} pinPoint={pinPoint} setPinPoint={setPinPoint} guessed={false} guessing={false} location={latLong} setKm={setKm} multiplayerState={multiplayerState} />


        <div className={`miniMap__btns ${showAnswer ? 'answerShownBtns' : ''}`}>
          <button className={`miniMap__btn ${!pinPoint||(multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final) ? 'unavailable' : ''} guessBtn`} disabled={!pinPoint||(multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final)} onClick={guess}>
           {multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final ? multiplayerState?.gameData?.players?.reduce((acc, cur) => {if(cur.final) return acc - 1;return acc;}, multiplayerState?.gameData?.players.length) > 0 ? `${text("waitingForPlayers", {p:multiplayerState?.gameData?.players?.reduce((acc, cur) => {if(cur.final) return acc - 1;return acc;}, multiplayerState?.gameData?.players.length)})}...` : `${text("waiting")}...` : text("guess")}
            </button>

          { !multiplayerState?.inGame && (
          <button className={`miniMap__btn hintBtn ${hintShown ? 'hintShown' : ''}`} onClick={showHint}>{text('hint')}</button>
          )}
        </div>
      </div>

      <div className={`mobile_minimap__btns ${miniMapShown ? 'miniMapShown' : ''} ${(showAnswer||singlePlayerRound?.done) ? 'answerShownBtns' : ''}`}>
        {miniMapShown && (
          <>
            {/* guess and hint  */}

            <button className={`miniMap__btn ${!pinPoint||(multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final) ? 'unavailable' : ''} guessBtn`} disabled={!pinPoint||(multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final)} onClick={guess}>
           {multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final ? multiplayerState?.gameData?.players?.reduce((acc, cur) => {if(cur.final) return acc - 1;return acc;}, multiplayerState?.gameData?.players.length) > 0 ? `${text("waitingForPlayers", {p: multiplayerState?.gameData?.players?.reduce((acc, cur) => {if(cur.final) return acc - 1;return acc;}, multiplayerState?.gameData?.players.length)})}...` :  `${text("waiting")}...` : text("guess")}
            </button>

          { !multiplayerState?.inGame && (
          <button className={`miniMap__btn hintBtn ${hintShown ? 'hintShown' : ''}`} onClick={showHint}>{text('hint')}</button>
          )}
          </>
        )}
        <button className={`gameBtn ${miniMapShown ? 'mobileMiniMapExpandedToggle' : ''}`} onClick={() => {
          setMiniMapShown(!miniMapShown)
        }}><FaMap size={miniMapShown ? 30 : 50} /></button>
      </div>
      </>
      )}

      { countryGuesser && otherOptions && (
        <CountryBtns countries={otherOptions} shown={!loading && showCountryButtons && !showAnswer}

         onCountryPress={(country) => {
          const isCorrect = country === latLong.country;
          if(!isCorrect && onboarding) {
            setOnboardingWords([
              "Not quite. Try again!",
            ])
            setOnboardingTextShown(true);
            setCountryGuesserCorrect(false);
          } else {
            setCountryGuesserCorrect(true);
            guess()
          }
         }}/>
      )}

      {onboarding && (
        <OnboardingText onboarding={onboarding} shown={!loading && onboardingTextShown}
        words={onboardingWords} pageDone={()=>{
          setShowCountryButtons(true)
          setOnboardingTextShown(false)
          if(onboarding?.round >= 2) {
          setOnboarding((prev) => {
            return {
              ...prev,
              nextRoundTime: Date.now() + 20000
            }
          })
        }
        }} />
      )}
      <span className={`timer ${!multiplayerTimerShown ? '' : 'shown'}`}>

{/* Round #{multiplayerState?.gameData?.curRound} / {multiplayerState?.gameData?.rounds} - {timeToNextMultiplayerEvt}s */}
      {text("roundTimer", {r:multiplayerState?.gameData?.curRound, mr: multiplayerState?.gameData?.rounds, t: timeToNextMultiplayerEvt})}
        </span>

        <span className={`timer ${!onboardingTimerShown ? '' : 'shown'}`}>

{/* Round #{multiplayerState?.gameData?.curRound} / {multiplayerState?.gameData?.rounds} - {timeToNextMultiplayerEvt}s */}
      {timeToNextRound ?
      text("roundTimer", {r:onboarding?.round, mr: 5, t: timeToNextRound})
      : text("round", {r:onboarding?.round, mr: 5})}

        </span>

        {
          singlePlayerRound && !singlePlayerRound?.done && (
            <span className="timer shown">
              {text("round", {r: singlePlayerRound.round, mr: singlePlayerRound.totalRounds})} -  {singlePlayerRound.locations.reduce((acc, cur) => acc + cur.points, 0)} {text("points")}

            </span>
          )
        }

        {multiplayerState && multiplayerState.inGame && multiplayerState?.gameData?.state === 'getready' && multiplayerState?.gameData?.curRound === 1 && (
          <BannerText text={
            text("gameStartingIn", {t:timeToNextMultiplayerEvt})
          } shown={true} />
        )}


        {multiplayerState && multiplayerState.inGame && ((multiplayerState?.gameData?.state === 'getready' && timeToNextMultiplayerEvt < 5 && multiplayerState?.gameData?.curRound !== 1 && multiplayerState?.gameData?.curRound <= multiplayerState?.gameData?.rounds)||(multiplayerState?.gameData?.state === "end")) && (
          <PlayerList multiplayerState={multiplayerState} playAgain={() => {


            backBtnPressed(true)

          }} backBtn={() => {

            backBtnPressed()
          }} />
        )}



    <ExplanationModal lat={latLong?.lat} long={latLong?.long} shown={explanationModalShown} onClose={() => {
        setExplanationModalShown(false)
      }} session={session} />

{/* <EndBanner xpEarned={xpEarned} usedHint={showHint} session={session} lostCountryStreak={lostCountryStreak} guessed={guessed} latLong={latLong} pinPoint={pinPoint} countryStreak={countryStreak} fullReset={fullReset} km={km} playingMultiplayer={playingMultiplayer} /> */}

<div className="endCards">
  { showAnswer && showClueBanner && (
<ClueBanner session={session} explanations={explanations} close={() => {setShowClueBanner(false)}} />
  )}
        <SaveStreakBanner close={() => {
        }} lostCountryStreak={lostCountryStreak} setLostCountryStreak={setLostCountryStreak} countryStreak={countryStreak} setCountryStreak={setCountryStreak} />

<EndBanner singlePlayerRound={singlePlayerRound} onboarding={onboarding} countryGuesser={countryGuesser} countryGuesserCorrect={countryGuesserCorrect} options={options} countryStreak={countryStreak} lostCountryStreak={lostCountryStreak} xpEarned={xpEarned} usedHint={hintShown} session={session}  guessed={showAnswer} latLong={latLong} pinPoint={pinPoint} fullReset={()=>{
  loadLocationFunc()

  }} km={km} setExplanationModalShown={setExplanationModalShown} multiplayerState={multiplayerState} toggleMap={() => {
    setShowPanoOnResult(!showPanoOnResult)
  }} panoShown={showPanoOnResult} />
  </div>

    </div>
  )
}
