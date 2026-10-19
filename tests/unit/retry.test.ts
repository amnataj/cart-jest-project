import { withRetry } from '../../src/retry';

describe('withRetry (fake timers)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns immediately when the first attempt succeeds', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, { retries: 3, delayMs: 100 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('backs off exponentially between attempts (100ms, then 200ms)', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { retries: 3, delayMs: 100 });

    await jest.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(199);
    expect(fn).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(3);

    await expect(promise).resolves.toBe('ok');
  });

  it('gives up after the configured number of retries and throws the last error', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('still failing'));
    const assertion = expect(withRetry(fn, { retries: 2, delayMs: 10 })).rejects.toThrow('still failing');
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3); // 1 attempt + 2 retries
  });

  it('does not retry when shouldRetry returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fatal'));
    await expect(withRetry(fn, { retries: 5, delayMs: 10, shouldRetry: () => false })).rejects.toThrow('fatal');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
