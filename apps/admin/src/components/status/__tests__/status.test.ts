import { describe, expect, it } from 'vitest';
import { failureFrom, notFoundFrom } from '../status';

// Shared by three screens now that the leaderboards, the table and the viewer detail each render an
// AsyncState. Every branch here is a status the generated client turns into data rather than
// throwing, so these builders are the only thing standing between a 5xx and an empty screen.
describe('failureFrom', () => {
  it('has nothing to say before the answer arrives', () => {
    expect(failureFrom(undefined)).toBeNull();
  });

  it('has nothing to say about a 200', () => {
    expect(failureFrom({ status: 200 })).toBeNull();
  });

  // 404 is its own branch elsewhere, rendered by the `not-found` slot rather than as a failure.
  it('leaves a 404 to the not-found slot', () => {
    expect(failureFrom({ status: 404 })).toBeNull();
  });

  it('names the status when nothing else is known', () => {
    expect(failureFrom({ status: 502 })).toBe('Request failed (HTTP 502)');
  });

  it("carries the server's own message when there is one", () => {
    expect(failureFrom({ status: 500, data: { message: 'Internal server error' } })).toBe(
      'Request failed (HTTP 500): Internal server error',
    );
  });

  it('ignores a body that carries no message', () => {
    expect(failureFrom({ status: 500, data: { other: true } })).toBe('Request failed (HTTP 500)');
    expect(failureFrom({ status: 500, data: 'not an object' })).toBe('Request failed (HTTP 500)');
  });
});

describe('notFoundFrom', () => {
  it('speaks only for a 404', () => {
    expect(notFoundFrom({ status: 404 }, 'Channel not found')).toBe('Channel not found');
  });

  it('stays out of the way for anything else', () => {
    expect(notFoundFrom({ status: 200 }, 'Channel not found')).toBeUndefined();
    expect(notFoundFrom({ status: 500 }, 'Channel not found')).toBeUndefined();
    expect(notFoundFrom(undefined, 'Channel not found')).toBeUndefined();
  });
});