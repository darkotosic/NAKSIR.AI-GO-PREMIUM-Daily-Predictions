.PHONY: test lint lint-only contract-check type-check smoke-test

test:
	pytest

lint:
	ruff check backend tests backend/tests scripts

lint-only: lint

contract-check:
	python scripts/contract_check.py

type-check:
	mypy --config-file mypy.ini

smoke-test:
	python scripts/smoke_test.py
