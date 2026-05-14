# ASM Pong

A tiny terminal Pong game for macOS Apple Silicon.

The terminal UI and keyboard input are written in C. The core game physics are
written in ARM64 assembly:

- ball movement
- wall bounce
- paddle collision
- scoring and reset

## Build

```bash
make
```

## Run

```bash
./asm_pong
```

## Web UI

Open `web/index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/web/`.

Web features:

- Goal burst effects when either side scores
- Random powerups: wide paddle, slow ball, and double point
- Score HUD with player hits, rally count, active power, and multiplier
- Responsive canvas sizing for desktop and mobile windows

## Test

```bash
make test
```

## Controls

- Player paddle: `w` and `s`
- CPU paddle: automatic, with stronger tracking when the ball attacks
- Restart after a win: `r`
- Quit: `q`

The first side to reach 5 points wins the round.
The terminal display uses ANSI colors for the ball, paddles, score, border, and
center line.

## Branch Idea

This branch turns the game into single-player Pong. The player controls the
left paddle, while a simple CPU opponent follows the ball from the right side.
The `feature/win-condition` branch adds a 5-point win condition and restart
flow.
The `feature/cpu-difficulty` branch gives the CPU a slower reaction speed so
the player has a fairer chance.
The `feature/terminal-colors` branch adds colored terminal rendering.
The `test/pong-step` branch adds a small C test harness for the ARM64 assembly
physics function.
The `feature/visual-polish` branch adds a cleaner HUD, center line, bottom
control hint, and centered win message.
The `feature/stronger-cpu` branch makes the CPU react faster when the ball is
moving toward it.
The `feature/web-ui` branch adds a browser-playable Canvas version.
The `feature/collision-effects` branch adds paddle flash, screen shake, ball
trail, and impact particles for Web UI collisions.
The `feature/pause-control` branch adds keyboard and button pause/resume for
the Web UI.
The `feature/ramped-collision-effects` branch ramps ball speed on every paddle
hit and upgrades player collisions after 5 hits.
The `feature/miss-zoom-effect` branch adds a dramatic zoom and burst when the
player misses the ball.
The `feature/responsive-canvas` branch resizes the Web UI playfield and game
objects to fit the browser window.
The `feature/powerups-goal-scoreboard` branch adds goal effects, random
powerups, and an expanded score HUD.

## Why This Is A Good Small Assembly Project

Pong has simple rules, but the update loop is real low-level logic: integer
coordinates, branches, comparisons, memory offsets, and state mutation. That
makes it a compact project for learning assembly without needing graphics APIs.
