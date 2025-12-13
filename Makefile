.PHONY: test lint lint-only

test:
pytest

lint:
ruff check backend tests backend/tests

lint-only: lint
