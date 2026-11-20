# State machines in «دور: زبان»

A map of the state machines that live implicitly in the code, for people and agents.
Read this before touching navigation or game flow. Keep it in sync when you add a state.

## 1. Screen navigation — `App.tsx` (`currentScreen: ScreenType`)

16 screens, changed by ~40 direct `setCurrentScreen(...)` calls.

| From | Event | To |
|---|---|---|
| INTRO | next | SETUP |
| INTRO | open online / history / Leitner | ONLINE_LOBBY / HISTORY / LEITNER |
| INTRO | single-player setup confirmed | SINGLE_PLAYER |
| INTRO | duel setup confirmed | DUEL_GAME |
| SETUP | pick language / categories | LANGUAGE_SELECT / CATEGORIES → back to SETUP |
| SETUP | players | PLAYERS |
| PLAYERS | start | SEATING_CONFIRM |
| SEATING_CONFIRM | confirm | GAME |
| GAME | exit | INTRO or SETUP |
| SINGLE_PLAYER | finish | SINGLE_REPORT → SINGLE_PLAYER (replay) or INTRO |
| ONLINE_LOBBY | room joined | ONLINE_GAME or ONLINE_DUEL |
| any | help | HELP → back to `prevScreen` |

Rules that are easy to break:
- `HELP` is an overlay: it remembers `prevScreen` and must return there.
- Help auto-resumes the game **only** if it paused a running turn (`helpPausedTurnRef`).
- A `?room=` link jumps straight to ONLINE_LOBBY on load.

## 2. Local game — `App.tsx` (`gameStatus: GameStatus`, `types.ts`)

`Setup → SeatingConfirm → ActiveTurn ⇄ Paused`, `ActiveTurn → RoundEnded → ActiveTurn`,
`ActiveTurn → WordExhaustion`, and finally `GameEnded / WinnerScreen` (terminal: resume never leaves them).

`currentScreen` and `gameStatus` are two variables describing one thing and must be set together:

| gameStatus | required currentScreen |
|---|---|
| Setup | INTRO or SETUP |
| SeatingConfirm | SEATING_CONFIRM |
| ActiveTurn, Paused, RoundEnded, WordExhaustion, GameEnded, WinnerScreen | GAME (or HELP over GAME) |

Always change both in the same handler (`startConfirmedGame`, `handleExitGame`, `handleExitToSetup`, …).
`GameStatus.RoundStarting` is only an alias of `PassPhone`.

## 3. Setup modals — `App.tsx`

`isSingleSetupOpen`, `isDuelSetupOpen`, `isLeaderboardOpen` are separate booleans that are only
meaningful on INTRO. Nothing prevents two being true at once; open one, close the others.

## 4. Online room — `onlineRoomService.ts`, `types.ts`

- Party room: `lobby → seating → playing ⇄ round_ended → game_over`
- Online duel: `waiting → playing → finished`

The status lives in Firestore; every client derives its screen from it. Write status changes only
through the service functions, never from a screen component.

## 5. Single player / duel session

Screen-level only: `SINGLE_PLAYER → SINGLE_REPORT`, `DUEL_GAME → INTRO`. "Exit to settings" goes to
INTRO **and** reopens the matching setup modal (not the multiplayer SETUP screen).
