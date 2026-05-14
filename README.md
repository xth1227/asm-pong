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

## Controls

- Player paddle: `w` and `s`
- CPU paddle: automatic
- Quit: `q`

## Branch Idea

This branch turns the game into single-player Pong. The player controls the
left paddle, while a simple CPU opponent follows the ball from the right side.

## Why This Is A Good Small Assembly Project

Pong has simple rules, but the update loop is real low-level logic: integer
coordinates, branches, comparisons, memory offsets, and state mutation. That
makes it a compact project for learning assembly without needing graphics APIs.
