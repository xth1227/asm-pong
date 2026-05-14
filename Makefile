CC = clang
CFLAGS = -Wall -Wextra -O2
TARGET = asm_pong

all: $(TARGET)

$(TARGET): main.o pong_step.o
	$(CC) $(CFLAGS) -o $(TARGET) main.o pong_step.o

main.o: main.c
	$(CC) $(CFLAGS) -c main.c

pong_step.o: pong_step.s
	$(CC) -c pong_step.s

clean:
	rm -f $(TARGET) *.o

.PHONY: all clean

