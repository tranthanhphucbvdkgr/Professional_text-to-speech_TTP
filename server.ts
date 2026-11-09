import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Shared server-side Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa thiết lập GEMINI_API_KEY trên máy chủ. Vui lòng cấu hình khóa API trong Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API Endpoint for TTS Generation
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { 
      transcript, 
      voiceName = 'Kore', 
      region = 'Nam', 
      voiceInstruction = '',
      vocalInstruction = '',
      speed = 1.0, 
      pitch = 0 
    } = req.body;

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      res.status(400).json({ error: 'Kịch bản không được để trống.' });
      return;
    }

    const ai = getAiClient();

    // Map base voices to supported Gemini 3.8 voice names
    const validVoices = ['Charon', 'Puck', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    // 1. Extract all emotional tags from the transcript to build performance direction
    const emotionTagMap: Record<string, string> = {
      'warm': 'ấm áp, tình cảm',
      'whisper': 'thì thầm, khẽ khàng, bí mật',
      'tension': 'kịch tính, hồi hộp, dồn dập',
      'joy': 'vui tươi, hân hoan, rạng rỡ',
      'sadness': 'u sầu, nghẹn ngào, xúc động',
      'anger': 'tức giận, gay gắt, phẫn nộ',
      'fear': 'sợ hãi, run rẩy, bất an',
      'mystery': 'bí ẩn, huyền bí, lôi cuốn',
      'formal': 'trang trọng, rành mạch, điềm đạm',
      'mellow': 'êm dịu, nhẹ nhàng',
      'shout': 'hét lớn, hào sảng, vang dội',
      'cold': 'lạnh lùng, xa cách',
      'sarcastic': 'mỉa mai, châm biếm',
      'romantic': 'lãng mạn, ngọt ngào',
      'energetic': 'năng động, sôi nổi, tràn đầy sức sống',
      'singing': 'ngân nga, du dương',
      'hát': 'ngân nga, điệu hát du dương',
      'cười lớn': 'vui vẻ, sảng khoái',
      'cười khúc khích': 'tươi tắn, khúc khích',
      'quát lớn': 'quát lớn, dứt khoát, uy lực',
      'hào hứng': 'hào hứng, phấn khởi',
      'nhẹ nhàng': 'nhẹ nhàng, từ tốn, thủ thỉ',
      'thở dài': 'trầm tư, thở dài',
      'kêu gào': 'kêu gọi tha thiết'
    };

    const foundEmotions: string[] = [];
    const rawTagMatches = transcript.match(/\[(.*?)\]/g) || [];
    rawTagMatches.forEach((match: string) => {
      const inner = match.slice(1, -1).toLowerCase().trim();
      if (emotionTagMap[inner]) {
        if (!foundEmotions.includes(emotionTagMap[inner])) {
          foundEmotions.push(emotionTagMap[inner]);
        }
      } else if (inner) {
        if (!foundEmotions.includes(inner)) {
          foundEmotions.push(inner);
        }
      }
    });

    // 2. Clean the transcript so the TTS model ONLY SPEAKS THE SCRIPT TEXT
    // Keep standard vocal bursts (<laugh>, <breath>, <gasp>) while stripping all bracket tags
    let spokenText = transcript
      .replace(/\[(cười lớn|cười khúc khích|laugh|giggle)\]/gi, ' <laugh> ')
      .replace(/\[(thở dài|breath)\]/gi, ' <breath> ')
      .replace(/\[(gasp)\]/gi, ' <gasp> ')
      .replace(/\[(.*?)\]/g, ' ') // Strip all [tags] so they are NEVER spoken aloud
      .replace(/\s+/g, ' ')
      .trim();

    // Fallback if stripped text is empty
    if (!spokenText) {
      spokenText = transcript.replace(/[\[\]]/g, ' ').trim();
    }

    // 3. Construct detailed directorial style for speechMetadata
    const styleDirectives: string[] = [];
    if (voiceInstruction) {
      styleDirectives.push(voiceInstruction);
    }
    if (region) {
      styleDirectives.push(`Âm hưởng vùng miền: ${region}`);
    }
    if (foundEmotions.length > 0) {
      styleDirectives.push(`Cảm xúc diễn xuất: ${foundEmotions.join(', ')}`);
    }
    if (vocalInstruction) {
      styleDirectives.push(`Đặc trưng giọng đọc: ${vocalInstruction}`);
    }
    if (speed !== 1.0) {
      styleDirectives.push(`Tốc độ nói: ${speed}x (${speed > 1.2 ? 'nhanh và dồn dập' : speed < 0.8 ? 'chậm rãi và từ tốn' : 'tự nhiên'})`);
    }
    if (pitch !== 0) {
      styleDirectives.push(`Tông giọng: ${pitch > 5 ? 'thanh cao, trong trẻo' : pitch < -5 ? 'trầm ấm, sâu lắng' : 'cân bằng'}`);
    }

    const finalStyle = styleDirectives.join('. ');

    // 4. Request speech generation: ONLY spokenText in text, directorial cues in speechMetadata.style
    // 4. Request speech generation
    // Use gemini-3.8-flash-tts as primary (flagship model for personas and vocal bursts)
    // with graceful fallback to gemini-3.8-flash-lite-tts
    const modelsToTry = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: spokenText,
                  speechMetadata: {
                    style: finalStyle,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });

        if (response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
          // Successfully obtained audio
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        const msg = modelErr?.message || '';
        // If quota exceeded, do not flood logs with raw JSON
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
          console.info(`Mô hình ${modelName} tạm thời hết hạn mức (429), thử mô hình kế tiếp...`);
        } else {
          console.info(`Mô hình ${modelName} gặp lỗi: ${msg.substring(0, 80)}, chuyển sang mô hình dự phòng...`);
        }
      }
    }

    if (!response && lastError) {
      const errMsg = lastError?.message || String(lastError);
      if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429') || lastError?.status === 429) {
        res.status(429).json({
          error: 'Hạn mức tạo giọng nói miễn phí của Gemini (Free Tier) tạm thời đã hết lượt hôm nay. Bạn có thể chọn khóa API có tính phí (Billing Enabled) trong Settings > Secrets, hoặc dùng tính năng "Nghe bằng giọng trình duyệt" có sẵn ngay dưới đây.',
          isQuotaExceeded: true,
        });
        return;
      }
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('API_KEY_INVALID') || lastError?.status === 403) {
        res.status(403).json({
          error: 'Khóa API Gemini chưa hợp lệ hoặc thiếu quyền truy cập. Vui lòng kiểm tra lại trong Settings > Secrets.',
        });
        return;
      }
      res.status(500).json({
        error: 'Không thể kết nối tới dịch vụ tạo giọng nói AI: ' + (errMsg.length > 150 ? errMsg.substring(0, 150) + '...' : errMsg),
      });
      return;
    }

    const candidate = response?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      if (candidate.finishReason === 'SAFETY') {
        res.status(400).json({ error: 'Nội dung bị chặn do vi phạm chính sách an toàn của hệ thống.' });
        return;
      }
    }

    const parts = candidate?.content?.parts || [];
    let base64Audio = '';
    for (const part of parts) {
      if (part.inlineData?.data) {
        base64Audio = part.inlineData.data;
        break;
      }
    }

    if (!base64Audio) {
      res.status(502).json({ 
        error: 'Mô hình AI không trả về dữ liệu âm thanh. ' + (candidate?.finishReason ? `(Lý do: ${candidate.finishReason})` : '') 
      });
      return;
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      format: 'wav',
      sampleRate: 24000,
    });
  } catch (err: any) {
    const message = err?.message || 'Lỗi không xác định khi tạo giọng nói.';
    res.status(500).json({ error: message });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TTS Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
