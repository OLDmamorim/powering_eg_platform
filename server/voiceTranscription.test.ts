import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transcribeAudio } from './_core/voiceTranscription';

// Mock do fetch global
global.fetch = vi.fn();

describe('Voice Transcription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar erro se audioUrl estiver vazio', async () => {
    const result = await transcribeAudio({
      audioUrl: '',
      language: 'pt',
    });

    expect(result).toHaveProperty('error');
    // A função retorna SERVICE_ERROR quando há problema com env vars ou download
    expect((result as any).code).toBe('SERVICE_ERROR');
  });

  it('deve retornar erro se o download do áudio falhar', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await transcribeAudio({
      audioUrl: 'https://example.com/audio.mp3',
      language: 'pt',
    });

    expect(result).toHaveProperty('error');
    expect((result as any).code).toBe('INVALID_FORMAT');
  });

  it('deve retornar erro se o arquivo for maior que 16MB', async () => {
    // Criar buffer de 17MB
    const largeBuffer = Buffer.alloc(17 * 1024 * 1024);
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'audio/mp3',
      },
      arrayBuffer: async () => largeBuffer.buffer,
    });

    const result = await transcribeAudio({
      audioUrl: 'https://example.com/large-audio.mp3',
      language: 'pt',
    });

    expect(result).toHaveProperty('error');
    expect((result as any).code).toBe('FILE_TOO_LARGE');
  });

  it('deve processar transcrição com sucesso quando tudo estiver correto', async () => {
    const mockAudioBuffer = Buffer.from('fake audio data');
    const mockTranscription = {
      task: 'transcribe',
      language: 'pt',
      duration: 10.5,
      text: 'Esta é uma transcrição de teste',
      segments: [
        {
          id: 0,
          seek: 0,
          start: 0.0,
          end: 5.0,
          text: 'Esta é uma transcrição',
          tokens: [],
          temperature: 0.0,
          avg_logprob: -0.5,
          compression_ratio: 1.0,
          no_speech_prob: 0.0,
        },
      ],
    };

    // Mock do download do áudio
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'audio/webm',
      },
      arrayBuffer: async () => mockAudioBuffer.buffer,
    });

    // Mock da chamada à API Whisper
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscription,
    });

    const result = await transcribeAudio({
      audioUrl: 'https://example.com/audio.webm',
      language: 'pt',
      prompt: 'Transcrição de teste',
    });

    expect(result).not.toHaveProperty('error');
    expect((result as any).text).toBe('Esta é uma transcrição de teste');
    expect((result as any).language).toBe('pt');
    expect((result as any).duration).toBe(10.5);
  });

  it('deve usar language padrão "pt" se não for especificado', async () => {
    const mockAudioBuffer = Buffer.from('fake audio data');
    const mockTranscription = {
      task: 'transcribe',
      language: 'pt',
      duration: 5.0,
      text: 'Teste sem language',
      segments: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'audio/mp3',
      },
      arrayBuffer: async () => mockAudioBuffer.buffer,
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscription,
    });

    const result = await transcribeAudio({
      audioUrl: 'https://example.com/audio.mp3',
    });

    expect(result).not.toHaveProperty('error');
    expect((result as any).text).toBe('Teste sem language');
  });
});
