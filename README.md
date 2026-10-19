# Cart & Checkout: Advanced Jest + TypeScript Testing Project

A small cart and checkout service (Node, Express, TypeScript) built to demonstrate a professional Jest test suite: unit tests, integration tests, mocking, fake timers, custom matchers, snapshots, coverage gates and CI.

## Quick start

```bash
npm install
npm test               # all tests
npm run test:unit
npm run test:integration
npm run test:coverage  # coverage report in ./coverage
npm run dev            # start the API on :3000
```

## What the service does

- Cart: add, update, remove items with quantity validation (1 to 99)
- Pricing (all money in integer cents): discounts `SAVE10`, `FLAT5` (min $30), `FREESHIP`; flat shipping, free over $100; 8% tax on the discounted subtotal
- Checkout: reserves stock, charges payment (retrying transient failures with exponential backoff), and rolls stock back if anything fails
- REST API: `GET /products`, `POST /carts`, `POST /carts/:id/items`, `GET /carts/:id?code=`, `POST /carts/:id/checkout`

## Test strategy

| Layer | Location | Focus |
|---|---|---|
| Unit | `tests/unit` | Pure logic: pricing rules, cart rules, retry/backoff, inventory, receipt formatting |
| Unit with mocks | `tests/unit/checkout.test.ts` | `CheckoutService` isolated from inventory and payment using `jest.Mocked<T>` |
| Integration | `tests/integration` | Real Express app driven over HTTP with Supertest: status codes, error contract, stock side effects |

### Techniques demonstrated

- Data-driven tests: `it.each` / `test.each` for discount, shipping, tax and quantity edge cases
- Mocking: typed `jest.fn()` mocks, `mockResolvedValueOnce` / `mockRejectedValueOnce` sequences, `toHaveBeenNthCalledWith`
- Fake timers: `jest.useFakeTimers()` and `advanceTimersByTimeAsync` to verify exponential backoff without real waiting
- Compensation testing: asserts stock is released when stock reservation or payment fails, and that declines are not retried
- Custom matcher: `toBeValidOrder()` checks structure and arithmetic consistency (`tests/helpers/setup.ts`)
- Snapshot testing: receipt formatting, with a fixed date so it stays deterministic
- Security and robustness: unexpected errors return a generic 500 without leaking internals; malformed JSON returns 400
- Test data factories: `tests/helpers/factories.ts`
- Coverage gates: `jest.config.js` fails the run below 90% statements/lines/functions and 85% branches
- Reporting: JUnit XML (`reports/junit.xml`) plus HTML/LCOV coverage
- CI: GitHub Actions runs typecheck and tests on Node 20 and 22, uploading reports as artifacts

## Design decisions worth noting

- Money is stored as integer cents to avoid floating-point errors
- Dependencies (`InventoryService`, `PaymentGateway`) are injected, which is what makes the service easy to test
- Discounts are validated before any stock is reserved, so invalid orders never touch inventory
