extern unsigned char __heap_base;

unsigned int bump_pointer = &__heap_base;
void* malloc(int n) {
  unsigned int r = bump_pointer;
  bump_pointer += n;
  return (void *)r;
}

void free(void* p) {
  // lol
}


int sum(int a[], int len) {
  int sum = 0;
  for(int i = 0; i < len; i++) {
    sum += a[i];
  }
  return sum;
}


int *add(int a[], int len) {
    int *new = (int *)malloc(len * sizeof(a[0]));

    for (int i = 0; i < len; i++) {
        new[i] = a[i] + 10;
    }

    return new;
}
