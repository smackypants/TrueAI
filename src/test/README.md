# Test Directory

This directory contains the testing infrastructure and setup for the trueai-localai project.

## Contents

### `setup.ts`
Global test setup file that:
- Configures Testing Library cleanup
- Mocks browser APIs (matchMedia, IntersectionObserver, ResizeObserver)
- Mocks IndexedDB
- Mocks the global `spark` object for testing

This file is automatically loaded before each test via the `vitest.config.ts` configuration.

## Test Organization

Tests are co-located with their source files throughout the codebase:

```
src/
├── lib/
│   ├── analytics.ts
│   ├── analytics.test.ts          # Analytics service tests
│   ├── utils.ts
│   └── utils.test.ts               # Utility function tests
├── hooks/
│   ├── use-mobile.ts
│   └── use-mobile.test.ts          # Custom hook tests
└── components/
    ├── ErrorFallback.tsx
    └── ErrorFallback.test.tsx      # Component tests
```

## Writing Tests

### Test Structure
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  it('should do something', () => {
    // Test implementation
    expect(result).toBe(expected)
  })
})
```

### Testing React Components
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from './MyComponent'

it('should handle user interactions', async () => {
  const user = userEvent.setup()
  render(<MyComponent />)

  const button = screen.getByRole('button')
  await user.click(button)

  expect(screen.getByText('Clicked')).toBeInTheDocument()
})
```

### Testing Custom Hooks
```typescript
import { renderHook, act } from '@testing-library/react'
import { useMyHook } from './useMyHook'

it('should update state correctly', () => {
  const { result } = renderHook(() => useMyHook())

  act(() => {
    result.current.updateValue('new value')
  })

  expect(result.current.value).toBe('new value')
})
```

### Mocking

#### Mock Functions
```typescript
const mockFn = vi.fn()
mockFn.mockReturnValue('mocked value')
mockFn.mockResolvedValue('async value')
```

#### Mock Modules
```typescript
vi.mock('./module', () => ({
  exportedFunction: vi.fn(),
}))
```

#### Mock Global Objects
The test setup already mocks common browser APIs. To mock additional globals:

```typescript
beforeEach(() => {
  global.myGlobal = vi.fn()
})
```

## Running Tests

See the main [TEST_COVERAGE_SUMMARY.md](../../TEST_COVERAGE_SUMMARY.md) for commands and more details.

### Quick Reference
```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run with UI
npm run test:ui

# Generate coverage
npm run test:coverage

# Run specific file
npm test -- src/lib/utils.test.ts
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it
2. **Use descriptive test names** - Test names should clearly describe what is being tested
3. **Arrange-Act-Assert** - Structure tests with clear setup, execution, and verification
4. **Avoid test interdependence** - Each test should be independent and runnable in isolation
5. **Use factories for test data** - Create reusable functions to generate test data
6. **Mock external dependencies** - Mock API calls, timers, and other external dependencies
7. **Test edge cases** - Include tests for error conditions and edge cases
8. **Keep tests fast** - Avoid unnecessary delays and complex setup

## Troubleshooting

### Tests timing out
- Increase timeout in specific tests: `it('test', async () => {...}, { timeout: 10000 })`
- Check for unresolved promises
- Verify mocks are working correctly

### Module import errors
- Ensure imports use correct relative paths
- Check that mocked modules match actual module structure
- Verify TypeScript configuration

### Flaky tests
- Avoid relying on timing (use `waitFor` instead of `setTimeout`)
- Ensure proper cleanup between tests
- Check for shared state between tests

## Contributing

When adding new features:
1. Write tests alongside your code
2. Aim for at least 80% code coverage
3. Test both success and failure paths
4. Include edge cases and error conditions
5. Update this documentation if you add new testing utilities
