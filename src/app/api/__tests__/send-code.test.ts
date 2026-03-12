import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/send-code/route';

vi.mock('@/storage/database', () => ({
  userManager: {
    findValidVerificationCode: vi.fn(),
    createVerificationCodeWithParams: vi.fn(),
  },
}));

import { userManager } from '@/storage/database';

describe('POST /api/auth/send-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost/api/auth/send-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  it('should return 400 for invalid phone number format', async () => {
    const request = createRequest({ phone: '1234567890' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('手机号格式不正确');
  });

  it('should return 400 for empty phone number', async () => {
    const request = createRequest({ phone: '' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should return 400 for phone number with wrong length', async () => {
    const request = createRequest({ phone: '1381234567' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should accept valid phone number format', async () => {
    vi.mocked(userManager.findValidVerificationCode).mockResolvedValue(null);
    vi.mocked(userManager.createVerificationCodeWithParams).mockResolvedValue({} as any);

    const request = createRequest({ phone: '13812345678' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('验证码已发送');
  });

  it('should accept phone numbers starting with 1[3-9]', async () => {
    vi.mocked(userManager.findValidVerificationCode).mockResolvedValue(null);
    vi.mocked(userManager.createVerificationCodeWithParams).mockResolvedValue({} as any);

    const validPrefixes = ['130', '150', '180', '199'];
    
    for (const prefix of validPrefixes) {
      vi.clearAllMocks();
      const request = createRequest({ phone: `${prefix}12345678` });
      const response = await POST(request);
      
      expect(response.status).toBe(200);
    }
  });

  it('should return 429 when code already sent recently', async () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000);
    vi.mocked(userManager.findValidVerificationCode).mockResolvedValue({
      id: '1',
      phone: '13812345678',
      code: '123456',
      type: 'login',
      expiresAt: futureDate,
      used: false,
      createdAt: new Date(),
    } as any);

    const request = createRequest({ phone: '13812345678' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.error).toBe('验证码已发送，请勿重复获取');
  });

  it('should use default type "login" when type not provided', async () => {
    vi.mocked(userManager.findValidVerificationCode).mockResolvedValue(null);
    vi.mocked(userManager.createVerificationCodeWithParams).mockResolvedValue({} as any);

    const request = createRequest({ phone: '13812345678' });
    await POST(request);

    expect(userManager.createVerificationCodeWithParams).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'login',
      })
    );
  });

  it('should create verification code with correct expiry time', async () => {
    vi.mocked(userManager.findValidVerificationCode).mockResolvedValue(null);
    vi.mocked(userManager.createVerificationCodeWithParams).mockResolvedValue({} as any);

    const request = createRequest({ phone: '13812345678' });
    await POST(request);

    const callArgs = vi.mocked(userManager.createVerificationCodeWithParams).mock.calls[0][0];
    const expiryTime = callArgs.expiresAt.getTime() - Date.now();
    
    expect(expiryTime).toBeGreaterThan(4 * 60 * 1000);
    expect(expiryTime).toBeLessThanOrEqual(5 * 60 * 1000);
  });

  it('should generate 6-digit code', async () => {
    vi.mocked(userManager.findValidVerificationCode).mockResolvedValue(null);
    vi.mocked(userManager.createVerificationCodeWithParams).mockResolvedValue({} as any);

    const request = createRequest({ phone: '13812345678' });
    await POST(request);

    const callArgs = vi.mocked(userManager.createVerificationCodeWithParams).mock.calls[0][0];
    expect(callArgs.code).toMatch(/^\d{6}$/);
  });
});
