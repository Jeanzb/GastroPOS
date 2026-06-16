import {
  createRefreshTokenSecret,
  formatRefreshToken,
  parseRefreshToken,
} from './refresh-token.util';

describe('refresh-token utilities', () => {
  it('formats and parses refresh token id plus secret', () => {
    const token = formatRefreshToken('token-id', 'secret');

    expect(parseRefreshToken(token)).toEqual({
      id: 'token-id',
      secret: 'secret',
    });
  });

  it('rejects malformed refresh tokens', () => {
    expect(parseRefreshToken('missing-secret')).toBeNull();
    expect(parseRefreshToken('too.many.parts')).toBeNull();
    expect(parseRefreshToken('.secret')).toBeNull();
  });

  it('creates URL-safe secrets', () => {
    expect(createRefreshTokenSecret()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

