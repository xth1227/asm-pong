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

- Left paddle: `w` and `s`
- Right paddle: `i` and `k`
- Quit: `q`

## Why This Is A Good Small Assembly Project

Pong has simple rules, but the update loop is real low-level logic: integer
coordinates, branches, comparisons, memory offsets, and state mutation. That
makes it a compact project for learning assembly without needing graphics APIs.

