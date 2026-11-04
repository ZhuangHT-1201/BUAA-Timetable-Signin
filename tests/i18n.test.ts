import { describe, expect, it } from 'vitest';
import { localizeErrorMessage } from '../src/i18n';

describe('localization helpers', () => {
  it('translates known campus errors to English', () => {
    expect(localizeErrorMessage('登录状态已失效，请重新登录。', 'en')).toBe(
      'Your session expired. Sign in again.',
    );
    expect(localizeErrorMessage('校园服务返回 HTTP 502。', 'en')).toBe(
      'Campus service returned HTTP 502.',
    );
  });

  it('keeps Chinese source messages for the Chinese UI', () => {
    expect(localizeErrorMessage('签到成功', 'zh')).toBe('签到成功');
  });
});
