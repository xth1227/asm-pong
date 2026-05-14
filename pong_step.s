.text
.globl _pong_step
.p2align 2

; typedef struct {
;   int ball_x;      // 0
;   int ball_y;      // 4
;   int vx;          // 8
;   int vy;          // 12
;   int left_y;      // 16
;   int right_y;     // 20
;   int left_score;  // 24
;   int right_score; // 28
;   int width;       // 32
;   int height;      // 36
; } GameState;
;
; void pong_step(GameState *state)
; x0 = state pointer

_pong_step:
    ldr w1, [x0, #0]      ; ball_x
    ldr w2, [x0, #4]      ; ball_y
    ldr w3, [x0, #8]      ; vx
    ldr w4, [x0, #12]     ; vy

    add w1, w1, w3
    add w2, w2, w4

; Bounce off top wall.
    cmp w2, #1
    b.ge check_bottom
    mov w2, #1
    neg w4, w4
    b check_left_paddle

check_bottom:
    ldr w5, [x0, #36]     ; height
    sub w5, w5, #2
    cmp w2, w5
    b.le check_left_paddle
    mov w2, w5
    neg w4, w4

check_left_paddle:
    cmp w1, #2
    b.ne check_right_paddle
    ldr w5, [x0, #16]     ; left_y
    cmp w2, w5
    b.lt check_right_paddle
    add w6, w5, #3
    cmp w2, w6
    b.gt check_right_paddle
    mov w1, #3
    mov w3, #1

check_right_paddle:
    ldr w5, [x0, #32]     ; width
    sub w5, w5, #3
    cmp w1, w5
    b.ne check_score_left
    ldr w6, [x0, #20]     ; right_y
    cmp w2, w6
    b.lt check_score_left
    add w7, w6, #3
    cmp w2, w7
    b.gt check_score_left
    sub w1, w5, #1
    mov w3, #-1

check_score_left:
    cmp w1, #0
    b.gt check_score_right
    ldr w5, [x0, #28]     ; right_score
    add w5, w5, #1
    str w5, [x0, #28]
    b reset_from_right_score

check_score_right:
    ldr w5, [x0, #32]     ; width
    sub w5, w5, #1
    cmp w1, w5
    b.lt save_state
    ldr w6, [x0, #24]     ; left_score
    add w6, w6, #1
    str w6, [x0, #24]
    b reset_from_left_score

reset_from_right_score:
    ldr w5, [x0, #32]
    lsr w1, w5, #1
    ldr w5, [x0, #36]
    lsr w2, w5, #1
    mov w3, #1
    mov w4, #1
    b save_state

reset_from_left_score:
    ldr w5, [x0, #32]
    lsr w1, w5, #1
    ldr w5, [x0, #36]
    lsr w2, w5, #1
    mov w3, #-1
    mov w4, #-1

save_state:
    str w1, [x0, #0]
    str w2, [x0, #4]
    str w3, [x0, #8]
    str w4, [x0, #12]
    ret

