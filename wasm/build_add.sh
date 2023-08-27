clang --target=wasm32 -O3 -flto -nostdlib -Wl,--no-entry -Wl,--export-all -Wl,--lto-O3 -Wl,--initial-memory=52428800 -o add.wasm add.c

#-Wl,-z,stack-size=$[32 * 1024 * 1024]
