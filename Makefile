.PHONY: build test lint release help

# Default target
help:
	@echo "LambdaTest MCP Release Makefile"
	@echo "Usage:"
	@echo "  make build          - Build the project"
	@echo "  make test           - Run all tests"
	@echo "  make lint           - Run lint check"
	@echo "  make release v=...  - Create a new release tag (e.g., make release v=1.0.1)"

# Build the project
build:
	npm run build

# Run tests
test:
	npm test

# Run linting
lint:
	npm run lint:check

# Create a release, update changelog and push tags
release: lint test
	@echo "Creating a new release..."
	npm run release
	git push origin main --tags
	@echo "Release created and pushed successfully."
