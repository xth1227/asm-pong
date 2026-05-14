CC = clang
CFLAGS = -Wall -Wextra -O2
TARGET = asm_pong
TEST_TARGET = test_pong_step

all: $(TARGET)

$(TARGET): main.o pong_step.o
	$(CC) $(CFLAGS) -o $(TARGET) main.o pong_step.o

main.o: main.c
	$(CC) $(CFLAGS) -c main.c

pong_step.o: pong_step.s
	$(CC) -c pong_step.s

$(TEST_TARGET): test_pong_step.o pong_step.o
	$(CC) $(CFLAGS) -o $(TEST_TARGET) test_pong_step.o pong_step.o

test_pong_step.o: test_pong_step.c
	$(CC) $(CFLAGS) -c test_pong_step.c

test: $(TEST_TARGET)
	./$(TEST_TARGET)

clean:
	rm -f $(TARGET) $(TEST_TARGET) *.o

.PHONY: all clean test
