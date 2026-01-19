import { describe, it, expect } from 'vitest';

describe('Telegram Bot Token Validation', () => {
  it('should validate the Telegram bot token', async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token).toBeDefined();
    expect(token).not.toBe('');
    
    // Test the token by calling the getMe endpoint
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.ok).toBe(true);
    expect(data.result).toBeDefined();
    expect(data.result.is_bot).toBe(true);
    
    console.log('Bot info:', data.result);
  });
});
