#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <termios.h>
#include <time.h>
#include <unistd.h>
#include <sys/select.h>

#define WIDTH 50
#define HEIGHT 18
#define PADDLE_SIZE 4
#define WIN_SCORE 5
#define CPU_MOVE_INTERVAL 3

#define COLOR_RESET "\033[0m"
#define COLOR_BORDER "\033[38;5;244m"
#define COLOR_PADDLE "\033[38;5;46m"
#define COLOR_BALL "\033[38;5;203m"
#define COLOR_SCORE "\033[38;5;81m"

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

static struct termios original_terminal;

static void restore_terminal(void) {
    tcsetattr(STDIN_FILENO, TCSANOW, &original_terminal);
    printf("\033[?25h\033[0m\n");
}

static void setup_terminal(void) {
    struct termios raw;
    tcgetattr(STDIN_FILENO, &original_terminal);
    raw = original_terminal;
    raw.c_lflag &= (tcflag_t) ~(ICANON | ECHO);
    raw.c_cc[VMIN] = 0;
    raw.c_cc[VTIME] = 0;
    tcsetattr(STDIN_FILENO, TCSANOW, &raw);
    printf("\033[?25l");
    atexit(restore_terminal);
}

static int key_pressed(void) {
    fd_set set;
    struct timeval timeout = {0, 0};
    FD_ZERO(&set);
    FD_SET(STDIN_FILENO, &set);
    return select(STDIN_FILENO + 1, &set, NULL, NULL, &timeout) > 0;
}

static void reset_game(GameState *state) {
    state->ball_x = WIDTH / 2;
    state->ball_y = HEIGHT / 2;
    state->vx = 1;
    state->vy = 1;
    state->left_y = HEIGHT / 2 - PADDLE_SIZE / 2;
    state->right_y = HEIGHT / 2 - PADDLE_SIZE / 2;
    state->left_score = 0;
    state->right_score = 0;
    state->width = WIDTH;
    state->height = HEIGHT;
}

static void move_paddle(int *paddle_y, int direction, int height) {
    *paddle_y += direction;
    if (*paddle_y < 1) {
        *paddle_y = 1;
    }
    if (*paddle_y > height - PADDLE_SIZE - 1) {
        *paddle_y = height - PADDLE_SIZE - 1;
    }
}

static void move_ai_paddle(GameState *state) {
    int paddle_center = state->right_y + PADDLE_SIZE / 2;

    if (state->ball_y < paddle_center) {
        move_paddle(&state->right_y, -1, state->height);
    } else if (state->ball_y > paddle_center) {
        move_paddle(&state->right_y, 1, state->height);
    }
}

static void draw(const GameState *state) {
    char screen[HEIGHT][WIDTH + 1];

    for (int y = 0; y < state->height; y++) {
        for (int x = 0; x < state->width; x++) {
            if (y == 0 || y == state->height - 1) {
                screen[y][x] = '-';
            } else if (x == 0 || x == state->width - 1) {
                screen[y][x] = '|';
            } else {
                screen[y][x] = ' ';
            }
        }
        screen[y][state->width] = '\0';
    }

    for (int i = 0; i < PADDLE_SIZE; i++) {
        screen[state->left_y + i][2] = '#';
        screen[state->right_y + i][state->width - 3] = '#';
    }

    screen[state->ball_y][state->ball_x] = 'O';

    printf("\033[H");
    printf(
        COLOR_SCORE "ASM Pong  player:%d  cpu:%d  quit:q" COLOR_RESET "\n",
        state->left_score,
        state->right_score
    );
    for (int y = 0; y < state->height; y++) {
        for (int x = 0; x < state->width; x++) {
            char cell = screen[y][x];
            if (cell == '-' || cell == '|') {
                printf(COLOR_BORDER "%c" COLOR_RESET, cell);
            } else if (cell == '#') {
                printf(COLOR_PADDLE "%c" COLOR_RESET, cell);
            } else if (cell == 'O') {
                printf(COLOR_BALL "%c" COLOR_RESET, cell);
            } else {
                putchar(cell);
            }
        }
        putchar('\n');
    }
    fflush(stdout);
}

static void draw_game_over(const GameState *state, int winner) {
    draw(state);
    printf(
        "\n" COLOR_SCORE "%s wins. Press r to restart or q to quit." COLOR_RESET "\n",
        winner == 1 ? "Player" : "CPU"
    );
    fflush(stdout);
}

int main(void) {
    GameState state;
    reset_game(&state);

    setup_terminal();
    printf("\033[2J");

    int running = 1;
    int winner = 0;
    int frame = 0;
    while (running) {
        while (key_pressed()) {
            char key = 0;
            if (read(STDIN_FILENO, &key, 1) != 1) {
                continue;
            }
            if (key == 'q') {
                running = 0;
            } else if (key == 'r' && winner != 0) {
                reset_game(&state);
                winner = 0;
                frame = 0;
                printf("\033[2J");
            } else if (key == 'w') {
                move_paddle(&state.left_y, -1, state.height);
            } else if (key == 's') {
                move_paddle(&state.left_y, 1, state.height);
            }
        }

        if (winner == 0) {
            if (frame % CPU_MOVE_INTERVAL == 0) {
                move_ai_paddle(&state);
            }
            pong_step(&state);
            frame++;
            if (state.left_score >= WIN_SCORE) {
                winner = 1;
            } else if (state.right_score >= WIN_SCORE) {
                winner = 2;
            }
        }

        if (winner == 0) {
            draw(&state);
        } else {
            draw_game_over(&state, winner);
        }

        struct timespec delay = {.tv_sec = 0, .tv_nsec = 70000000};
        nanosleep(&delay, NULL);
    }

    return 0;
}
