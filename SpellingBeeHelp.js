class LetterLengthMap {
  constructor() {
    this.map = new Map();
  }

  get(letter, length) {
    const value = this.map.get(letter.toUpperCase())?.get(length);
    return value !== 0 ? value : undefined;
  }

  set(letter, length, newValue) {
    if (!this.map.has(letter.toUpperCase())) {
      this.map.set(letter.toUpperCase(), new Map())
    }
    return this.map.get(letter.toUpperCase()).set(length, newValue)
  }

  lengths() {
    const lengths = new Set()
    for (const lengthMap of this.map.values()) {
      for (const entry of lengthMap.entries()) {
        if (entry[1] > 0) {
          lengths.add(entry[0])
        }
      }
    }
    return [...lengths].sort((a, b) => a - b)
  }

  letters() {
    const letters = new Set()
    for (const entry of this.map.entries()) {
      for (const value of entry[1].values()) {
        if (value > 0) {
          letters.add(entry[0])
          break
        }
      }
    }
    return [...letters].sort()
  }

  subtract(word) {
    const currValue = this.get(word[0].toUpperCase(), word.length)
    this.set(word[0].toUpperCase(), word.length, currValue - 1)
  }

  clone() {
    const clone = new LetterLengthMap();
    const lengths = this.lengths();
    this.letters().forEach(letter => {
      lengths.forEach(length => {
        clone.set(letter, length, this.get(letter, length))
      })
    })
    return clone
  }
}

const state = {
  solutionLoaded: false,
  foundWords: [],
  showingHints: false,
}

const solutionGrid = new LetterLengthMap()
const solutionPairs = new Map()

const populateSolutionGrid = (solutionGridText) => {
  const lengths = solutionGridText.match(/(\s+[0-9]+)*/)[0].split(/\s+/)
  const dataStringArray = solutionGridText.match(/[A-Za-z]:(\s+[0-9-]+)*/g)
  dataStringArray.forEach(dataString => {
    const data = dataString.split(/\s+/)
    const letter = data[0][0].toUpperCase();
    for (let i = 1; i < lengths.length; i++) {
      const count = data[i] === "-" ? 0 : parseInt(data[i])
      solutionGrid.set(letter, parseInt(lengths[i]), count)
    }
  })
}

const populateSolutionPairs = (solutionPairText) => {
  const toks = solutionPairText.match(/[A-Za-z]{2}-\d+/g);
  toks.forEach(tok => {
    const halves = tok.split("-");
    solutionPairs.set(halves[0].toUpperCase(), parseInt(halves[1]))
  })
}

const styles = `
.sb-controls-box {
  flex-direction: column;
}
.sbh-help-container {
  display: flex;
  flex-direction: row;
}
.sbh-help-container .sbh-help-grid {
  display: grid;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #dcdcdc;
  height: fit-content;
}
.sbh-help-container .sbh-help-grid .sbh-help-cell {
  text-align: center;
  margin: 6px;
}
.sbh-help-container .sbh-help-grid .sbh-help-length, 
.sbh-help-container .sbh-help-grid .sbh-help-letter {
  font-weight: bold;
}
.sbh-help-container .sbh-right-side {
  display: flex;
  flex-direction: column;
  margin-left: 10px;
}
.sbh-pair {
  margin-bottom: 6px;
}
`

const styleSheet = document.createElement("style")
styleSheet.innerText = styles
document.head.appendChild(styleSheet)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let retries = 5;
let inFlight = false;

const makeHttpObject = () => {
  if ("XMLHttpRequest" in window) return new XMLHttpRequest();
  else if ("ActiveXObject" in window) return new ActiveXObject("Msxml2.XMLHTTP");
}

const loadSolution = async () => {
  if (retries === 0 || getSolutionLoaded() || inFlight) {
    return
  }
  inFlight = true
  const request = makeHttpObject();
  const href = document.querySelector(".pz-toolbar-button__hints")?.href
  if (!href) {
    await sleep(5000)
    retries--
    loadSolution()
    return
  }
  request.open("GET", href, true);
  request.send(null);
  request.onreadystatechange = async () => {
    inFlight = false;
    if (request.readyState == 4) {
      const parser = new DOMParser();
      const helpDoc = parser.parseFromString(request.responseText, 'text/html');
      const headerRegex = /WORDS: \d+, POINTS: \d+, PANGRAMS: \d+/
      const pairRegex = /[A-Za-z]{2}-\d+/;
      populateSolutionPairs(
        Array.from(helpDoc.querySelectorAll('p'))
          .find(p => pairRegex.test(p.innerText)).innerText);
      populateSolutionGrid(
        Array.from(helpDoc.querySelectorAll('p'))
          .find(p => headerRegex.test(p.innerText))
          .nextElementSibling.innerText);
      refresh()
    } else {
      await sleep(5000)
      retries--
      loadSolution()
    }
  };
}

const getFoundWords = () => [...document.querySelectorAll(".sb-wordlist-items-pag li, sb-recent-words-wrap li")].map(li => li.innerText)
const getSolutionLoaded = () => solutionGrid.lengths().length > 0
const getNewState = (other) => {
  return { ...state, foundWords: getFoundWords(), solutionLoaded: getSolutionLoaded(), ...other }
}

const makeDiv = (classNames, content) => {
  const div = document.createElement("div")
  classNames.forEach(className => div.classList.add(className))
  div.textContent = content;
  return div;
}

const renderPairs = () => {
  const pairs = makeDiv(["sbh-pairs"])
  const currentNotFound = new Map(solutionPairs)
  state.foundWords.forEach(word => {
    const key = word.substring(0, 2).toUpperCase();
    currentNotFound.set(key, currentNotFound.get(key) - 1);
  })
  const pairMap = new Map() // map from first letter to string
  for (entry of currentNotFound.entries()) {
    if (entry[1] > 0) {
      const pairString = `${entry[0]}-${entry[1]}`;
      pairMap.set(entry[0][0], pairMap.has(entry[0][0]) ? `${pairMap.get(entry[0][0])} ${pairString}` : pairString)
    }
  }
  for (value of pairMap.values()) {
    pairs.appendChild(makeDiv(["sbh-pair"], value))
  }
  return pairs;
}

const renderRightSide = () => {
  const rightSide = makeDiv(["sbh-right-side"])
  rightSide.appendChild(renderPairs())
  rightSide.appendChild(renderButton())
  return rightSide
}

const getNotFound = () => {
  const notFound = solutionGrid.clone()
  state.foundWords.forEach(word => notFound.subtract(word))
  return notFound
}

const renderGrid = () => {
  const grid = makeDiv(["sbh-help-grid"]);

  const currentNotFound = getNotFound()
  const lengths = currentNotFound.lengths();
  grid.appendChild(makeDiv(["sbh-help-cell"])) // top left corner
  lengths.map(length => makeDiv(["sbh-help-length", "sbh-help-cell"], length)).forEach(cell => grid.appendChild(cell)) // top row
  currentNotFound.letters().forEach(letter => {
    grid.appendChild(makeDiv(["sbh-help-letter", "sbh-help-cell"], letter)) // letter on left
    lengths.map(length => makeDiv(["sbh-help-cell"], currentNotFound.get(letter, length) ?? "-")).forEach(cell => grid.appendChild(cell)) // rest of row
  })

  const gridStyle = document.createElement("style")
  gridStyle.innerText = `.sbh-help-grid { grid-template-columns: ${"auto ".repeat(lengths.length + 1)};}`
  grid.appendChild(gridStyle)

  return grid
}

const renderButton = () => {
  const button = document.createElement("button");
  button.classList.add("hive-action");
  button.innerText = state.showingHints ? "Hide" : "Hints";
  button.type = "button";
  button.onclick = () => {
    refresh(getNewState({ showingHints: !state.showingHints }))
  }
  return button;
}

const renderHelpContainer = () => {
  const sbContainer = document.querySelector(".sb-controls-box");
  const helpContainer = sbContainer.querySelector(".sbh-help-container");
  if (helpContainer) {
    return helpContainer
  }
  const div = document.createElement("div");
  div.classList.add("sbh-help-container");
  sbContainer.appendChild(div)
  return div
}

const render = () => {
  const container = renderHelpContainer();
  container.textContent = "";
  if (getNotFound().letters().length === 0) {
    return;
  }
  if (state.showingHints) {
    container.appendChild(renderGrid())
    container.appendChild(renderRightSide())
  } else {
    container.appendChild(renderButton())
  }
}

const refresh = (newState) => {
  const ns = newState ?? getNewState({})

  if (ns.solutionLoaded !== state.solutionLoaded ||
    ns.foundWords.length !== state.foundWords.length ||
    ns.showingHints !== state.showingHints ||
    !document.querySelector(".sbh-help-container")) {
    state.solutionLoaded = ns.solutionLoaded
    state.foundWords = ns.foundWords
    state.showingHints = ns.showingHints
    render();
  }
}

refresh();
loadSolution();

const observer = new MutationObserver(() => {
  refresh();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
