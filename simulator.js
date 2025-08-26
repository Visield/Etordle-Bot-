import {
  rawTowers,
  matchesFilters,
  towerNameLength,
  filteredCandidates,
  scoreCandidate,
  computeStats
} from "./script.js";

function simulateEtordleGame(correctAnswerAcronym, priorGuesses = [], forcedFirstGuessAcronym = null) {
  const answer = rawTowers.find(t => t.acronym === correctAnswerAcronym);
  if (!answer) throw new Error("Answer acronym not found in tower list!");

  const simulatedGuesses = [...priorGuesses];
  const maxSteps = 50;
  let steps = 0;
  let firstGuess = null;

  if (forcedFirstGuessAcronym) {
    const forcedGuessTower = rawTowers.find(t => t.acronym === forcedFirstGuessAcronym);
    if (!forcedGuessTower) throw new Error("Forced first guess acronym not found in tower list!");

    const emojiStates = {
      towerNameLength: compareAttr(towerNameLength(forcedGuessTower), towerNameLength(answer)),
      difficulty: compareAttr(forcedGuessTower.difficulty, answer.difficulty),
      area: compareAreaEmoji(forcedGuessTower, answer),
      towerType: compareEquality(forcedGuessTower.towerType, answer.towerType),
      length: compareAttr(forcedGuessTower.length, answer.length),
    };

    simulatedGuesses.push({ tower: forcedGuessTower, emojiStates });
    steps++;
    firstGuess = forcedFirstGuessAcronym;

    if (forcedFirstGuessAcronym === answer.acronym) {
      return {
        steps,
        correctAnswer: answer.acronym,
        firstGuess,
      };
    }
  }

  while (true) {
    const guessedAcronyms = new Set(simulatedGuesses.map(g => g.tower.acronym));

    const candidates = filteredCandidates
      .filter(candidate => !guessedAcronyms.has(candidate.acronym))
      .filter(candidate => matchesFilters(candidate, simulatedGuesses));

    if (candidates.length === 0) {
      console.warn("No candidates left. Guesses so far:", simulatedGuesses.map(g => g.tower.acronym));
      throw new Error("Simulation failed: no candidates left.");
    }

    const stats = computeStats(candidates);
    candidates.sort((a, b) => scoreCandidate(b, stats) - scoreCandidate(a, stats));
    const guess = candidates[0];

    steps++;
    if (!firstGuess) firstGuess = guess.acronym;

    if (steps > maxSteps) {
      throw new Error(`Simulation exceeded ${maxSteps} steps without finding the answer.`);
    }

    if (guess.acronym === answer.acronym) {
      return {
        steps,
        correctAnswer: answer.acronym,
        firstGuess,
      };
    }

    const emojiStates = {
      towerNameLength: compareAttr(towerNameLength(guess), towerNameLength(answer)),
      difficulty: compareAttr(guess.difficulty, answer.difficulty),
      area: compareAreaEmoji(guess, answer),
      towerType: compareEquality(guess.towerType, answer.towerType),
      length: compareAttr(guess.length, answer.length),
    };

    simulatedGuesses.push({ tower: guess, emojiStates });
  }
}



function compareAttr(guessVal, answerVal) {
  if (guessVal === answerVal) return "✅";
  if (typeof guessVal !== "number" || typeof answerVal !== "number") return "🔴";
  return guessVal < answerVal ? "⬆️" : "⬇️";
}

function compareEquality(guessVal, answerVal) {
  return guessVal === answerVal ? "✅" : "🔴";
}

function compareAreaEmoji(guess, answer) {
  const sameWorld = guess.world === answer.world;
  const sameArea = guess.area === answer.area;
  const sameSubrealm = guess.subrealmName === answer.subrealmName;

  if (sameWorld && sameArea && sameSubrealm) return "✅";

  const guessHasSubrealm = !!guess.subrealmName;
  const answerHasSubrealm = !!answer.subrealmName;

  if (sameWorld && sameArea && guessHasSubrealm !== answerHasSubrealm) {
    return "🔄";
  }

  if (!sameWorld) return "🔴";

  if (guess.area < answer.area) return "⬆️";
  if (guess.area > answer.area) return "⬇️";

  return "🔴";
}

export { simulateEtordleGame };
