.PHONY: build test

build:
	pnpm run build
test:
	pnpm run build && pnpm tsx test/index.ts
