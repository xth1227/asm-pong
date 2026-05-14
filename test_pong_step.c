#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int ball_x;
    int ball_y;
    int vx;
    int vy;
    int left_y;
    int right_y;
    int left_score;
    int right_score;
    int width;
    int height;
} GameState;

void pong_step(GameState *state);

static void check(int condition, const char *message) {
    if (!condition) {
        fprintf(stderr, "FAIL: %s\n", message);
        exit(1);
    }
}

static GameState base_state(void) {
    return (GameState) {
        .ball_x = 25,
        .ball_y = 9,
        .vx = 1,
        .vy = 1,
        .left_y = 7,
        .right_y = 7,
        .left_score = 0,
        .right_score = 0,
        .width = 50,
        .height = 18,
    };
}

static void test_bottom_bounce(void) {
    GameState state = base_state();
    state.ball_y = 16;
    state.vy = 1;

    pong_step(&state);

    check(state.ball_y == 16, "ball stays inside bottom wall");
    check(state.vy == -1, "bottom wall reverses vertical velocity");
}

static void test_left_paddle_bounce(void) {
    GameState state = base_state();
    state.ball_x = 3;
    state.ball_y = 8;
    state.vx = -1;

    pong_step(&state);

    check(state.ball_x == 3, "left paddle pushes ball back into field");
    check(state.vx == 1, "left paddle reverses horizontal velocity");
}

static void test_right_player_scores(void) {
    GameState state = base_state();
    state.ball_x = 0;
    state.vx = -1;

    pong_step(&state);

    check(state.right_score == 1, "right player scores when ball exits left");
    check(state.ball_x == 25, "ball resets to horizontal center");
    check(state.ball_y == 9, "ball resets to vertical center");
}

int main(void) {
    test_bottom_bounce();
    test_left_paddle_bounce();
    test_right_player_scores();
    puts("pong_step tests passed");
    return 0;
}

