import { simulateEtordleGame } from "./simulator.js";

const difficultyLabels = [
  "Easy", "Medium", "Hard", "Difficult", "Challenging", 
  "Intense", "Remorseless", "Insane", "Extreme", "Terrifying", "Catastrophic"
];

const towerTypeMap = { "Tower": 1, "Citadel": 2, "Steeple": 3 };
const towerTypeLabels = { 1: "Tower", 2: "Citadel", 3: "Steeple" };

const lengthLabels = [
  "<20 Minutes",
  "20+ Minutes",
  "30+ Minutes",
  "45+ Minutes",
  "60+ Minutes",
  "90+ Minutes"
];

const specialAreas = {
  FR: {name: "Forgotten Ridge", ring: 1, world: 1, subrealm: true},
  GoE: {name: "Garden of Eeshol", ring: 2, world: 1, subrealm: true},
  SA: {name: "Silent Abyss", ring: 4, world: 1, subrealm: true},
  LR: {name: "Lost River", ring: 5, world: 1, subrealm: true},
  AT: {name: "Ashen Towerworks", ring: 6, world: 1, subrealm: true},
  TSA: {name: "The Starlit Archives", ring: 8, world: 1, subrealm: true},
  PA: {name: "Paradise Atoll", zone: 1, world: 2, subrealm: true},
  AA: {name: "Arcane Area", zone: 2, world: 2, subrealm: true}
};

let rawTowers = [];
let guesses = [];
let filteredCandidates = [];

const emojiCycles = {
  towerNameLength: ["⬆️", "⬇️", "✅"],
  difficulty: ["⬆️", "⬇️", "✅"],
  area: ["⬆️", "⬇️", "🔴", "✅", "🔄"],
  towerType: ["🔴", "✅"],
  length: ["⬆️", "⬇️", "✅"]
};

function cycleEmoji(currentEmoji, category) {
  const cycle = emojiCycles[category];
  const currentIndex = cycle.indexOf(currentEmoji);
  const nextIndex = (currentIndex + 1) % cycle.length;
  return cycle[nextIndex];
}

function parseWorldAreaSubrealm(areaStr, towerAcronym) {
  let world = 1;
  if (areaStr.includes("Ring")) world = 1;
  else if (areaStr.includes("Zone")) world = 2;
  else if (towerAcronym === "PA" || towerAcronym === "AA") world = 2;

  let subrealmName = null;
  let subrealmInfo = null;
  for (const [code, info] of Object.entries(specialAreas)) {
    if (areaStr.startsWith(code) || towerAcronym === code) {
      subrealmName = info.name;
      world = info.world;
      subrealmInfo = info;
      break;
    }
  }

  if (towerAcronym === "PA" || towerAcronym === "AA") {
    world = 2;
    areaNum = 1;
    subrealmName = specialAreas[towerAcronym].name;
    isSubrealm = true;
    return { world, areaNum, subrealmName, isSubrealm };
  }

  let areaNumMatch = areaStr.match(/\d+/);
  let areaNum = areaNumMatch ? parseInt(areaNumMatch[0], 10) : null;

  if (!areaNum && subrealmInfo) {
    areaNum = subrealmInfo.ring || subrealmInfo.zone || 1;
  }
  if (!areaNum) areaNum = 1;

  return { world, areaNum, subrealmName, isSubrealm: !!subrealmInfo };
}

function processTowerInfo() {
  rawTowers = Object.entries(towerInfo).map(([key, val]) => {
    const acronym = val[0];
    const difficulty = val[1] + 1;
    const areaStr = val[2];
    const towerTypeStr = val[3];
    const lengthCode = val[4];

    const { world, areaNum, subrealmName, isSubrealm } = parseWorldAreaSubrealm(areaStr, acronym);

    const towerType = towerTypeMap[towerTypeStr] || null;
    const length = lengthCode + 1;

    return {
      key,
      acronym,
      difficulty,
      world,
      area: areaNum,
      subrealmName,
      isSubrealm,
      towerType,
      length
    };
  });
}

function createDefaultEmojiStates() {
  return {
    towerNameLength: "✅",
    difficulty: "✅",
    area: "✅",
    towerType: "✅",
    length: "✅"
  };
}

function createGuessRow(guessObj, index) {
  const row = document.createElement("div");
  row.classList.add("guessRow");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "repeat(6, max-content)";
  row.style.gap = "10px";
  row.style.alignItems = "center";
  row.style.marginBottom = "5px";

  const acronymSpan = document.createElement("span");
  acronymSpan.textContent = guessObj.tower.acronym;
  acronymSpan.classList.add("guessAcronym");
  acronymSpan.style.cursor = "pointer";
  acronymSpan.title = "Click to focus input";
  acronymSpan.onclick = () => {
    document.getElementById("guessInput").value = guessObj.tower.acronym;
    document.getElementById("guessInput").focus();
  };
  row.appendChild(acronymSpan);

  ["towerNameLength", "difficulty", "area", "towerType", "length"].forEach(cat => {
    const emojiSpan = document.createElement("span");
    emojiSpan.textContent = guessObj.emojiStates[cat];
    emojiSpan.classList.add("emojiToggle");
    emojiSpan.style.cursor = "pointer";
    emojiSpan.title = `Toggle ${cat}`;
    emojiSpan.style.fontSize = "20px";
    emojiSpan.style.userSelect = "none";

    emojiSpan.onclick = () => {
      guessObj.emojiStates[cat] = cycleEmoji(guessObj.emojiStates[cat], cat);
      emojiSpan.textContent = guessObj.emojiStates[cat];
      generateNextGuess();
    };
    row.appendChild(emojiSpan);
  });

  return row;
}

function difficultyToLabel(diff) {
  if (diff < 1 || diff > 11) return "Unknown";
  return difficultyLabels[diff - 1];
}

function towerTypeToLabel(typeNum) {
  return towerTypeLabels[typeNum] || "Unknown";
}

function lengthToLabel(lenNum) {
  if (lenNum < 1 || lenNum > 6) return "Unknown";
  return lengthLabels[lenNum - 1];
}

function towerNameLength(tower) {
  return tower.acronym.length;
}

function matchesFilters(candidate, guesses) {
  for (const guess of guesses) {
    const tower = guess.tower;
    const emoji = guess.emojiStates;

    const gLen = towerNameLength(tower);
    const cLen = towerNameLength(candidate);

    if (!matchesEmojiFilter(cLen, gLen, emoji.towerNameLength, "towerNameLength")) return false;
    if (!matchesEmojiFilter(candidate.difficulty, tower.difficulty, emoji.difficulty, "difficulty")) return false;

    if (!matchesAreaEmoji(
      { world: candidate.world, area: candidate.area, subrealm: candidate.subrealmName },
      { world: tower.world, area: tower.area, subrealm: tower.subrealmName },
      emoji.area
    )) return false;

    if (!matchesEmojiFilter(candidate.towerType, tower.towerType, emoji.towerType, "towerType")) return false;
    if (!matchesEmojiFilter(candidate.length, tower.length, emoji.length, "length")) return false;
  }
  return true;
}

function getAreaLabel(world, zoneOrRingNumber) {
  if (world === 2) {
    return `Zone ${zoneOrRingNumber}`;
  } else {
    return `Ring ${zoneOrRingNumber}`;
  }
}

function matchesEmojiFilter(candidateVal, guessVal, emoji, attribute) {
  switch (emoji) {
    case "✅":
      return candidateVal === guessVal;
    case "⬆️":
      return candidateVal > guessVal;
    case "⬇️":
      return candidateVal < guessVal;
    case "🔴":
      if (attribute === "towerType") return candidateVal !== guessVal;
      if (attribute === "area") return candidateVal !== guessVal;
      return candidateVal !== guessVal;
    default:
      return true;
  }
}



function matchesAreaEmoji(candidateArea, guessArea, emoji) {
  const candidateWorld = candidateArea.world;
  const guessWorld = guessArea.world;
  const candidateAreaNum = candidateArea.area;
  const guessAreaNum = guessArea.area;

  const isConnectedSubrealm = (a, b) => {
    if (a.subrealm && !b.subrealm && a.world === b.world && a.area === b.area) return true;
    if (b.subrealm && !a.subrealm && b.world === a.world && b.area === a.area) return true;
    return false;
  };

  switch (emoji) {
    case "✅":
      return candidateWorld === guessWorld &&
             candidateAreaNum === guessAreaNum &&
             ((candidateArea.subrealm && guessArea.subrealm && candidateArea.subrealm === guessArea.subrealm) || 
             (!candidateArea.subrealm && !guessArea.subrealm));

    case "🔴":
      return candidateWorld !== guessWorld;

    case "🔄":
      return isConnectedSubrealm(candidateArea, guessArea);

    case "⬆️":
      if (candidateWorld !== guessWorld) return false;
      if (candidateAreaNum > guessAreaNum) return true;
      return false;

    case "⬇️":
      if (candidateWorld !== guessWorld) return false;
      if (candidateAreaNum < guessAreaNum) return true;
      return false;

    default:
      return true;
  }
}




function computeStats(candidates) {
  if (candidates.length === 0) return null;

  const difficulties = candidates.map(c => c.difficulty).sort((a,b)=>a-b);
  const areas = candidates.map(c => c.area).sort((a,b)=>a-b);

  const medianDiff = difficulties[Math.floor(difficulties.length / 2)];
  const medianArea = areas[Math.floor(areas.length / 2)];

  function mode(arr) {
    const freq = {};
    arr.forEach(v => freq[v] = (freq[v] || 0) + 1);
    let maxCount = 0, modeVal = arr[0];
    for (const [val, count] of Object.entries(freq)) {
      if (count > maxCount) {
        maxCount = count;
        modeVal = Number(val);
      }
    }
    return modeVal;
  }

  const mostCommonTowerType = mode(candidates.map(c => c.towerType));
  const mostCommonAcronymLength = mode(candidates.map(c => c.acronym.length));
  const mostCommonLength = mode(candidates.map(c => c.length));

  return {
    medianDiff,
    medianArea,
    mostCommonTowerType,
    mostCommonAcronymLength,
    mostCommonLength
  };
}


function scoreCandidate(candidate, stats) {
  if (!stats) return 0;
  function gradientScore(value, target, maxDistance) {
    const dist = Math.abs(value - target);
    const offset = (value === target) ? 0.5 : 0
    if (dist >= maxDistance) return 0;
    return offset + 1 - dist / maxDistance;
  }
  const maxDiffDistance = 5;
  const maxAreaDistance = 5;

  const diffScore = gradientScore(candidate.difficulty, stats.medianDiff, maxDiffDistance);
  const areaScore = gradientScore(candidate.area, stats.medianArea, maxAreaDistance);
  const towerTypeScore = candidate.towerType === stats.mostCommonTowerType ? 1 : 0;
  const acronymLengthScore = gradientScore(candidate.acronym.length, stats.mostCommonAcronymLength, 3);
  const lengthScore = gradientScore(candidate.length, stats.mostCommonLength, 2);

  const totalScore =
    diffScore * 1.5 +
    areaScore * 1.5 +
    towerTypeScore * 1.3 +
    acronymLengthScore * 1.4 +
    lengthScore * 1.3;

  return totalScore * 100;
}

function generateCandidateList() {
  const guessedAcronyms = new Set(guesses.map(g => g.tower.acronym));

  filteredCandidates = rawTowers
    .filter(candidate => matchesFilters(candidate, guesses))
    .filter(candidate => !guessedAcronyms.has(candidate.acronym));

  const stats = computeStats(filteredCandidates);
  filteredCandidates.sort((a, b) => scoreCandidate(b, stats) - scoreCandidate(a, stats));
}



function renderCandidateList() {
  const container = document.getElementById("nextGuessList");
  if (!container) {
    console.error("No element with id 'candidateList' found!");
    return;
  }

  container.innerHTML = "";

  if (filteredCandidates.length === 0) {
    container.textContent = "No candidates found matching the filters.";
    return;
  }

  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.width = "100%";
  table.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  ["Acronym", "Difficulty", "Area", "Tower Type", "Length", "Score", "Avg Guesses"].forEach(text => {
    const th = document.createElement("th");
    th.textContent = text;
    th.style.border = "1px solid #ddd";
    th.style.padding = "8px";
    th.style.backgroundColor = "#f2f2f2";
    th.style.textAlign = "left";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  filteredCandidates.forEach(cand => {
    const row = document.createElement("tr");
    row.style.cursor = "pointer";
    row.onclick = () => {
      addGuess(cand.acronym);
    }

    const acronymTd = document.createElement("td");
    acronymTd.textContent = cand.acronym;
    acronymTd.style.border = "1px solid #ddd";
    acronymTd.style.padding = "8px";
    row.appendChild(acronymTd);

    const diffTd = document.createElement("td");
    diffTd.textContent = difficultyToLabel(cand.difficulty);
    diffTd.style.border = "1px solid #ddd";
    diffTd.style.padding = "8px";
    row.appendChild(diffTd);

    const areaTd = document.createElement("td");
    areaTd.textContent = cand.subrealmName || getAreaLabel(cand.world, cand.area);
    areaTd.style.border = "1px solid #ddd";
    areaTd.style.padding = "8px";
    row.appendChild(areaTd);

    const typeTd = document.createElement("td");
    typeTd.textContent = towerTypeToLabel(cand.towerType);
    typeTd.style.border = "1px solid #ddd";
    typeTd.style.padding = "8px";
    row.appendChild(typeTd);

    const lengthTd = document.createElement("td");
    lengthTd.textContent = lengthToLabel(cand.length);
    lengthTd.style.border = "1px solid #ddd";
    lengthTd.style.padding = "8px";
    row.appendChild(lengthTd);

    const scoreTd = document.createElement("td");
    scoreTd.textContent = scoreCandidate(cand, computeStats(filteredCandidates)).toFixed(0);
    scoreTd.style.border = "1px solid #ddd";
    scoreTd.style.padding = "8px";
    row.appendChild(scoreTd);

    const avgGuessesTd = document.createElement("td");
    avgGuessesTd.textContent = "-";
    avgGuessesTd.style.border = "1px solid #ddd";
    avgGuessesTd.style.padding = "8px";
    row.appendChild(avgGuessesTd);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function deleteLastGuess() {
  if (guesses.length > 0) {
    guesses.pop();
    generateNextGuess();
  }
}

function generateNextGuess() {
  generateCandidateList();
  renderCandidateList();
  renderGuesses();
}

function renderGuesses() {
  const guessContainer = document.getElementById("guessList");
  guessContainer.innerHTML = "";
  guesses.forEach((guessObj, idx) => {
    guessContainer.appendChild(createGuessRow(guessObj, idx));
  });
}

function addGuess(acronym) {
  const tower = rawTowers.find(t => t.acronym.toLowerCase() === acronym.toLowerCase());
  if (!tower) {
    alert("Tower acronym not found!");
    return;
  }
  const emojiStates = createDefaultEmojiStates();

  guesses.push({ tower, emojiStates });
  generateNextGuess();
}

function init() {
  processTowerInfo();

  const input = document.getElementById("guessInput");
  const addButton = document.getElementById("submitGuessBtn");
  const deleteBtn = document.getElementById("deleteLastGuessBtn");
  const simulateBtn = document.getElementById("calculateAvgGuessesBtn");
  const findBtn = document.getElementById("findHardestBtn")

  addButton.onclick = () => {
    const val = input.value.trim();
    if (val) addGuess(val);
    input.value = "";
  };

  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addButton.click();
    }
  };

  deleteBtn.onclick = deleteLastGuess;
  simulateBtn.onclick = runSimulationsForAllCandidates;
  findBtn.onclick = findHardestWordFor;

  guesses = [];
  generateNextGuess();
}

window.onload = init;



function runSimulationsForAllCandidates() {
  if (!filteredCandidates.length) {
    alert("No candidates available to simulate.");
    return;
  }

  const numSimulations = 101;
  const delayPerSim = 5;

  let candidateIndex = 0;

  function simulateForCandidate() {
    if (candidateIndex >= filteredCandidates.length) return;

    const candidate = filteredCandidates[candidateIndex];
    let totalSteps = 0;
    let completed = 0;

    function simulateOneRound() {
      const possibleAnswers = filteredCandidates.filter(c => c.acronym !== candidate.acronym);
      const randomAnswer = possibleAnswers[Math.floor(Math.random() * possibleAnswers.length)].acronym;

      let result;
      try {
        result = simulateEtordleGame(randomAnswer, [], candidate.acronym);
        totalSteps += result.steps;
      } catch (err) {
        console.error(`Simulation failed for ${candidate.acronym}:`, err);
        completed++;
        if (completed < numSimulations) {
          setTimeout(simulateOneRound, delayPerSim);
        } else {
          candidateIndex++;
          setTimeout(simulateForCandidate, 0);
        }
        return;
      }

      const avg = (totalSteps / (completed + 1)).toFixed(2);
      updateAvgGuessesCell(candidate.acronym, avg);

      completed++;
      if (completed < numSimulations) {
        setTimeout(simulateOneRound, delayPerSim);
      } else {
        candidateIndex++;
        setTimeout(simulateForCandidate, 0);
      }
    }

    simulateOneRound();
  }

  simulateForCandidate();
}


function updateAvgGuessesCell(acronym, avgText) {
  const table = document.getElementById("nextGuessList");
  if (!table) return;

  Array.from(table.querySelectorAll("tbody tr")).forEach(row => {
    const cell = row.children[0];
    const avgCell = row.children[6];
    if (cell.textContent.trim() === acronym) {
      avgCell.textContent = `Avg: ${avgText}`;
      avgCell.classList.add("avgGuessValue");
    }
  });
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}



async function findHardestWordFor() {
  const hardestInputElem = document.getElementById("hardestInput");
  const acronym = hardestInputElem?.value?.trim();

  if (!acronym) {
    alert("Please enter a tower acronym.");
    return;
  }

  const guesser = rawTowers.find(t => t.acronym.toLowerCase() === acronym.toLowerCase());
  if (!guesser) {
    return null;
  }

  let maxGuesses = -1;
  let hardestWord = null;
  let failures = [];

  document.getElementById("hardestOutput").textContent = "calculating"

  for (const target of rawTowers) {
    if (target.acronym === guesser.acronym) continue;

    try {
      const result = simulateEtordleGame(target.acronym, [], guesser.acronym);

      if (result.steps > maxGuesses) {
        maxGuesses = result.steps;
        hardestWord = target.acronym;
      }
    } catch (err) {
      failures.push(target.acronym);
    }

    await delay(1);
  }

  document.getElementById("hardestOutput").innerHTML = 
    `hardest word to solve using ${guesser.acronym} is ${hardestWord} taking ${maxGuesses} guesses <br> (delete all guesses before using this pls, otherwise it breaks)`;

  return { guessWord: acronym, hardestWord, maxGuesses };
}

export {
  rawTowers,
  scoreCandidate,
  matchesFilters,
  computeStats,
  towerNameLength,
  filteredCandidates
};
