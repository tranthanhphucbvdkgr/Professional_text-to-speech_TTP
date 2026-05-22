/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  Play, 
  Pause,
  Download, 
  Loader2, 
  BookOpen, 
  Mic2, 
  RefreshCw,
  Info,
  Trash2,
  FileUp,
  HelpCircle,
  Sparkles,
  ChevronRight,
  X,
  ShieldCheck,
  Zap,
  AlertCircle,
  Layout,
  Target,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import * as lamejs from "lamejs";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";

// --- Visual Components ---

const GeneratingWaves = () => (
  <div className="flex items-end justify-center gap-1.5 h-16 w-full">
    {[...Array(15)].map((_, i) => (
      <motion.div
        key={i}
        animate={{
          height: [10, 50, 15, 40, 10],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          delay: i * 0.1,
          ease: "easeInOut"
        }}
        className={`w-2 rounded-full shadow-lg ${i % 2 === 0 ? 'bg-blue-500' : 'bg-pink-500'}`}
      />
    ))}
  </div>
);

const SparklingParticles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(30)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ 
          x: Math.random() * 100 + "%", 
          y: Math.random() * 100 + "%",
          opacity: 0,
          scale: 0
        }}
        animate={{ 
          opacity: [0, 0.8, 0],
          scale: [0, 1.2, 0],
          y: ["0%", "-50%"]
        }}
        transition={{ 
          duration: 2 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2
        }}
        className={`absolute w-1 h-1 rounded-full blur-[1px] ${i % 2 === 0 ? 'bg-blue-400' : 'bg-pink-400'}`}
      />
    ))}
  </div>
);

// Fix for pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Types
type VoiceName = 'Charon' | 'Puck' | 'Kore' | 'Fenrir' | 'Zephyr';

interface VoiceOption {
  id: string;
  baseVoice: VoiceName;
  name: string;
  description: string;
  region: 'Bắc' | 'Trung' | 'Nam';
  instruction?: string;
}

interface VoicePreset {
  id: string;
  name: string;
  voice: VoiceName;
}

const VOICES: VoiceOption[] = [
  // Miền Nam
  { id: 'nam-charon', baseVoice: 'Charon', name: 'Thanh Sang', region: 'Nam', description: 'Giọng nam miền Nam, trầm ấm, truyền cảm, phù hợp kể truyện tự sự', instruction: 'Giọng miền Nam chuẩn, phong thái rành mạch, ấm áp.' },
  { id: 'nam-kore', baseVoice: 'Kore', name: 'Minh Nguyệt', region: 'Nam', description: 'Giọng nữ miền Nam, ấm áp, nhẹ nhàng, chuyên kể truyện tâm lý', instruction: 'Giọng nữ miền Nam nhẹ nhàng, truyền cảm.' },
  { id: 'nam-puck', baseVoice: 'Zephyr', name: 'Bé Ba', region: 'Nam', description: 'Giọng nữ miền Nam, trẻ trung, linh hoạt, phù hợp vai trẻ em', instruction: 'Giọng nữ miền Nam trẻ tươi, hồn nhiên.' },
  { id: 'nam-zephyr', baseVoice: 'Charon', name: 'Ông Năm', region: 'Nam', description: 'Giọng nam miền Nam, điềm tĩnh, giọng ông lão hiền từ', instruction: 'Giọng nam miền Nam, phong cách người già từ tốn.' },
  { id: 'nam-fenrir', baseVoice: 'Fenrir', name: 'Hùng Dũng', region: 'Nam', description: 'Giọng nam miền Nam, mạnh mẽ, uy lực, phù hợp vai phản diện', instruction: 'Giọng nam miền Nam mạnh mẽ, dứt khoát.' },
  
  // Miền Bắc
  { id: 'bac-charon', baseVoice: 'Charon', name: 'Duy Mạnh', region: 'Bắc', description: 'Giọng nam miền Bắc, thanh lịch, trang trọng, chuẩn xác', instruction: 'Giọng miền Bắc chuẩn, phong thái trang trọng, rành mạch.' },
  { id: 'bac-kore', baseVoice: 'Kore', name: 'Ngọc Huyền', region: 'Bắc', description: 'Giọng nữ miền Bắc, Hà Nội gốc, dịu dàng, quý phái', instruction: 'Giọng nữ Hà Nội thanh lịch, dịu dàng.' },
  { id: 'bac-puck', baseVoice: 'Zephyr', name: 'Thùy Chi', region: 'Bắc', description: 'Giọng nữ miền Bắc trẻ trung, ngọt ngào, trong sáng', instruction: 'Giọng nữ miền Bắc nhẹ nhàng, trong trẻo như sương sớm.' },
  
  // Miền Trung
  { id: 'trung-charon', baseVoice: 'Charon', name: 'Hoàng Bách', region: 'Trung', description: 'Giọng nam miền Trung, mộc mạc, chân chất, gần gũi', instruction: 'Giọng miền Trung mộc mạc, âm sắc đặc trưng địa phương.' },
  { id: 'trung-kore', baseVoice: 'Kore', name: 'Phương Nam', region: 'Trung', description: 'Giọng nữ miền Trung, sâu lắng, đậm đà, truyền cảm', instruction: 'Giọng nữ miền Trung sâu lắng, đôn hậu.' },
  { id: 'trung-huế', baseVoice: 'Kore', name: 'Hương Giang', region: 'Trung', description: 'Giọng nữ Huế, dịu dàng, uyển chuyển, thơ mộng', instruction: 'Giọng nữ Huế ngọt ngào, âm điệu uyển chuyển.' },
  
  // Miền Tây (Sub-region of Nam)
  { id: 'nam-miềntây', baseVoice: 'Fenrir', name: 'Gia Bảo', region: 'Nam', description: 'Giọng nam miền Tây, hào sảng, thật thà, chân chất', instruction: 'Giọng nam miền Tây hào sảng, chân chất.' },
];

const VALID_TAGS = [
  "warm", "whisper", "tension", "joy", "sadness", "anger", "fear", "mystery",
  "formal", "mellow", "breath", "pause", "southern", "shout", "cold", "sarcastic",
  "romantic", "energetic", "singing", "humming", "melodic", "vocal", "scream", "laugh",
  "hát", "cười lớn", "cười khúc khích", "quát lớn", "hào hứng", "nhẹ nhàng", "giggle"
];

const DEFAULT_TRANSCRIPT = `[joy] Xin chào! Mình là Trần Thanh Phúc, [energetic] đây là một ứng dụng chuyển văn bản thành giọng nói theo phong cách kể chuyện. [shout] Các bạn có thể sử dụng nó một cách thoải mái nhất và giọng đọc sẽ hay nhất theo ý thích của các bạn. [mystery] Nào hãy bắt đầu viết nội dung của các bạn vào đây và thực hiện thôi![joy] `;

/**
 * Converts raw PCM data (L16) to a WAV file format.
 * Gemini TTS returns 16-bit PCM at 24000Hz (Mono).
 */
function convertToWav(audioData: Uint8Array, sampleRate: number = 24000, isStereo: boolean = false): Blob {
  const numChannels = isStereo ? 2 : 1;
  const bitsPerSample = 16;
  
  const dataSize = audioData.length;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const uint8View = new Uint8Array(buffer, 44);
  uint8View.set(audioData);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Converts raw PCM data (L16) to an MP3 file format.
 */
function convertToMp3(audioData: Uint8Array, sampleRate: number = 24000, bitrate: number = 192, isStereo: boolean = false): Blob {
  const numTotalSamples = Math.floor(audioData.byteLength / 2);
  const numChannels = isStereo ? 2 : 1;
  const samplesPerChannel = isStereo ? numTotalSamples / 2 : numTotalSamples;
  
  const dataView = new DataView(audioData.buffer, audioData.byteOffset, audioData.byteLength);
  const mp3encoder = new (lamejs as any).Mp3Encoder(numChannels, sampleRate, bitrate);
  const mp3Data: any[] = [];
  const sampleBlockSize = 1152; 

  if (isStereo) {
    // Input is interleaved L-R
    const left = new Int16Array(samplesPerChannel);
    const right = new Int16Array(samplesPerChannel);
    
    for (let i = 0; i < samplesPerChannel; i++) {
      left[i] = dataView.getInt16(i * 4, true);
      right[i] = dataView.getInt16(i * 4 + 2, true);
    }

    for (let i = 0; i < samplesPerChannel; i += sampleBlockSize) {
      const leftChunk = left.subarray(i, i + sampleBlockSize);
      const rightChunk = right.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
  } else {
    // Input is mono
    const samples = new Int16Array(samplesPerChannel);
    for (let i = 0; i < samplesPerChannel; i++) {
      samples[i] = dataView.getInt16(i * 2, true);
    }

    for (let i = 0; i < samplesPerChannel; i += sampleBlockSize) {
      const chunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
  }
  
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) mp3Data.push(mp3buf);

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

export default function App() {
  const [transcript, setTranscript] = useState(DEFAULT_TRANSCRIPT);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(VOICES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rawAudioData, setRawAudioData] = useState<Uint8Array | null>(null);
  const [vocalInstruction, setVocalInstruction] = useState<string>("");
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'wav' | 'mp3' | 'aac' | 'ogg' | 'flac' | 'wma'>('mp3');
  const [downloadBitrate, setDownloadBitrate] = useState<number>(192);
  const [isStereoExport, setIsStereoExport] = useState<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Initialize AI client lazily
    if (!aiRef.current && process.env.GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      let text = "";
      const fileType = file.name.split('.').pop()?.toLowerCase();

      if (fileType === 'txt') {
        text = await file.text();
      } else if (fileType === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (fileType === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n";
        }
        text = fullText;
      } else {
        throw new Error("Định dạng tệp không được hỗ trợ. Vui lòng tải lên .txt, .pdf hoặc .docx");
      }

      if (text.trim()) {
        setTranscript(text);
        setCommandFeedback("Đã tải kịch bản từ tệp");
      } else {
        throw new Error("Không thể trích xuất văn bản từ tệp này.");
      }
    } catch (err) {
      console.error("File Upload Error:", err);
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tải tệp.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setCommandFeedback(null), 3000);
    }
  };

  const [command, setCommand] = useState("");
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [tagValidationReport, setTagValidationReport] = useState<{
    unknown: { tag: string, suggestion?: string }[],
    malformed: string[],
    duplicate: string[]
  } | null>(null);

  const expandToStereo = (data: Uint8Array): Uint8Array => {
    const numSamples = data.length / 2;
    const stereoData = new Uint8Array(data.length * 2);
    const view = new DataView(data.buffer, data.byteOffset, data.length);
    const stereoView = new DataView(stereoData.buffer);
    for (let i = 0; i < numSamples; i++) {
      const sample = view.getInt16(i * 2, true);
      stereoView.setInt16(i * 4, sample, true);
      stereoView.setInt16(i * 4 + 2, sample, true);
    }
    return stereoData;
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim().toLowerCase();
    
    if (cmd.startsWith("/voice ")) {
      const voiceNamePart = cmd.replace("/voice ", "").trim();
      const foundVoice = VOICES.find(v => v.name.toLowerCase().includes(voiceNamePart) || v.id.toLowerCase() === voiceNamePart);
      if (foundVoice) {
        setSelectedVoiceId(foundVoice.id);
        setCommandFeedback(`Đã chuyển sang giọng: ${foundVoice.name} (${foundVoice.region})`);
      } else {
        setCommandFeedback(`Không tìm thấy giọng: ${voiceNamePart}`);
      }
    } else if (cmd.startsWith("/set ")) {
      const instruction = command.slice(5).trim();
      setVocalInstruction(instruction);
      setCommandFeedback(`Đã thiết lập đặc trưng giọng: ${instruction.substring(0, 20)}...`);
    } else if (cmd === "/clear") {
      setTranscript("");
      setCommandFeedback("Đã xóa văn bản");
    } else {
      setCommandFeedback("Lệnh không hợp lệ. Thử /voice [tên_giọng]");
    }
    
    setCommand("");
    setTimeout(() => setCommandFeedback(null), 3000);
  };

  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = transcript;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = `${before}${tag} ${after}`;
    setTranscript(newText);
    
    // Reset focus and cursor position after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + tag.length + 1;
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newPos, newPos);
          }
        });
      }
    }, 0);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => setDuration(audio.duration);
    }
  }, []);

  const togglePlay = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError("Vui lòng nhập kịch bản hoặc tải tài liệu lên trước khi chuyển đổi.");
      return;
    }

    if (!aiRef.current) {
      setError("AI client not initialized. Check your API key.");
      return;
    }

    setIsGenerating(true);
    setIsPlaying(false);
    setError(null);
    setAudioUrl(null);
    setRawAudioData(null);

    try {
      const currentVoice = VOICES.find(v => v.id === selectedVoiceId) || VOICES[0];
      
      // Build normalized context
      const regionContext = `Vùng miền: ${currentVoice.region}. ${currentVoice.instruction || ""}`;
      const speedContext = `Tốc độ nói: ${speed}x (với 1.0 là bình thường, >1.0 là nhanh hơn, <1.0 là chậm hơn). ${speed > 1.2 ? "Hãy nói cực nhanh và dồn dập." : speed < 0.8 ? "Hãy nói thật chậm rãi và thong thả." : ""}`;
      const pitchContext = `Tông giọng (Pitch): ${pitch} (với 0 là bình thường, dương là cao hơn, âm là trầm hơn). ${pitch > 5 ? "Hãy dùng tông giọng rất cao và thanh thoát." : pitch < -5 ? "Hãy dùng tông giọng rất trầm và sâu lắng." : ""}`;
      const combinedInstruction = `[instruction] ${regionContext} ${speedContext} ${pitchContext} ${vocalInstruction}`;
    const systemDirective = "BẠN LÀ MỘT DIỄN VIÊN LỒNG TIẾNG CHUYÊN NGHIỆP CẤP CAO. Bạn phải thực hiện các chỉ dẫn cảm xúc đặt trong ngoặc vuông như [joy], [shout], [laugh], [hát], [cười lớn], [cười khúc khích], [quát lớn], [hào hứng], [nhẹ nhàng]... bằng cách thay đổi tông giọng, tốc độ nói và hơi thở ngay lập tức. TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỌC CÁC TỪ TRONG NGOẶC VUÔNG. CHỈ ĐỌC VĂN BẢN. Bạn phải tuân thủ nghiêm ngặt các chỉ số Tốc độ và Tông giọng được yêu cầu.";
    const prompt = `HƯỚNG DẪN HỆ THỐNG: ${systemDirective}\n\nTHIẾT LẬP GIỌNG ĐỌC:\n- ${regionContext}\n- ${speedContext}\n- ${pitchContext}\n- ${vocalInstruction}\n\nKỊCH BẢN CẦN THỰC HIỆN (HÃY DIỄN XUẤT THEO CÁC THẺ TRONG NGOẶC):\n${transcript}`;

      const response = await aiRef.current.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: currentVoice.baseVoice },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        console.warn("Gemini Generation interrupted:", candidate.finishReason);
        if (candidate.finishReason === 'SAFETY') {
          throw new Error("Nội dung bị chặn do vi phạm chính sách an toàn. Vui lòng thử nội dung khác.");
        }
      }

      const parts = candidate?.content?.parts || [];
      let base64Audio = "";
      
      // Iterate through parts to find the audio data
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Audio = part.inlineData.data;
          break;
        }
      }
      
      if (!base64Audio) {
        console.error("Gemini Response without audio part:", response);
        throw new Error("Không nhận được dữ liệu âm thanh từ AI. (Lý do: " + (candidate?.finishReason || "Không xác định") + ")");
      }

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Audio);
      const audioData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        audioData[i] = binaryString.charCodeAt(i);
      }

      setRawAudioData(audioData);

      // Create WAV blob for instant playback
      const blob = convertToWav(audioData, 24000);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);

    } catch (err) {
      console.error("Generation Error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate audio.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getTTPFilename = (ext: string) => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `ttp-${dd}-${mm}-${yyyy}.${ext}`;
  };

  const handleDownload = async () => {
    if (!rawAudioData) return;
    
    try {
      let finalAudioBlob: Blob;
      let extension = downloadFormat;
      let filename = getTTPFilename(extension);
      
      const speechData = isStereoExport ? expandToStereo(rawAudioData) : rawAudioData;
      
      if (downloadFormat === 'mp3') {
        finalAudioBlob = convertToMp3(speechData, 24000, downloadBitrate, isStereoExport);
      } else {
        finalAudioBlob = convertToWav(speechData, 24000, isStereoExport);
      }
      
      const url = URL.createObjectURL(finalAudioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error("Download Error:", err);
      setError("Không thể xử lý âm thanh để tải về.");
    }
  };

  const removeTagAt = (index: number) => {
    const parts = transcript.split(/(\[.*?\])/);
    if (index < 0 || index >= parts.length) return;
    
    // Save current cursor position
    const cursor = textareaRef.current?.selectionStart || 0;
    
    // Calculate how many characters are before the removed tag to adjust cursor
    let charsBefore = 0;
    for (let i = 0; i < index; i++) {
      charsBefore += parts[i].length;
    }
    const tagLength = parts[index].length;

    // Remove the part at the specified index
    const newParts = [...parts];
    newParts.splice(index, 1);
    const newTranscript = newParts.join('');
    
    setTranscript(newTranscript);

    // Restore focus and adjust cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextCursor = cursor > charsBefore ? Math.max(charsBefore, cursor - tagLength) : cursor;
        
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(nextCursor, nextCursor);
          }
        });
      }
    }, 10);
  };

  const getLevenshteinDistance = (a: string, b: string): number => {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      }
    }
    return matrix[a.length][b.length];
  };

  const validateTags = () => {
    const tagRegex = /\[(.*?)\]/g;
    const matches = Array.from(transcript.matchAll(tagRegex));
    const report: {
      unknown: { tag: string, suggestion?: string }[],
      malformed: string[],
      duplicate: string[]
    } = { unknown: [], malformed: [], duplicate: [] };

    const seenTags = new Set<string>();

    matches.forEach(match => {
      const fullTag = match[0];
      const tagName = match[1].toLowerCase().trim();
      
      if (!VALID_TAGS.includes(tagName)) {
        // Find suggestion
        let bestMatch = "";
        let minDistance = 3; // Max threshold for suggestion
        
        VALID_TAGS.forEach(validTag => {
          const distance = getLevenshteinDistance(tagName, validTag);
          if (distance < minDistance) {
            minDistance = distance;
            bestMatch = validTag;
          }
        });
        
        report.unknown.push({ 
          tag: fullTag, 
          suggestion: bestMatch ? `[${bestMatch}]` : undefined 
        });
      } else {
        if (seenTags.has(tagName)) {
          report.duplicate.push(fullTag);
        }
        seenTags.add(tagName);
      }
    });

    // Detailed malformed check
    const openIndices: number[] = [];
    const closedIndices: number[] = [];
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i] === '[') openIndices.push(i);
      if (transcript[i] === ']') closedIndices.push(i);
    }
    
    if (openIndices.length !== closedIndices.length) {
      report.malformed.push(`Mất cân bằng ngoặc: ${openIndices.length} mở, ${closedIndices.length} đóng.`);
    }

    if (report.unknown.length === 0 && report.malformed.length === 0 && report.duplicate.length === 0) {
      setCommandFeedback("Tất cả các thẻ đều hoàn hảo!");
      setTagValidationReport(null);
      return;
    }

    setTagValidationReport(report);
  };

  const getFontSizeClass = () => {
    const len = transcript.length;
    if (len < 100) return "text-3xl md:text-4xl lg:text-5xl";
    if (len < 300) return "text-2xl md:text-3xl lg:text-4xl";
    if (len < 600) return "text-xl md:text-2xl lg:text-3xl";
    if (len < 1000) return "text-lg md:text-xl lg:text-2xl";
    return "text-base md:text-lg lg:text-xl";
  };

  const COMMAND_PRESETS = [
    { label: "Nam miền Nam ấm áp", cmd: "/set giọng nam miền Nam ấm áp, truyền cảm" },
    { label: "Nữ miền Nam nhẹ nhàng", cmd: "/set giọng nữ miền Nam nhẹ nhàng, trong trẻo" },
    { label: "Nam miền Bắc trang trọng", cmd: "/set giọng nam miền Bắc rành mạch, trang trọng" },
    { label: "Nữ miền Bắc thanh lịch", cmd: "/set giọng nữ miền Bắc thanh lịch, chuẩn xác" },
    { label: "Nam miền Trung mộc mạc", cmd: "/set giọng nam miền Trung chân chất, mộc mạc" },
    { label: "Nữ miền Trung sâu lắng", cmd: "/set giọng nữ miền Trung ngọt ngào, sâu lắng" },
    { label: "Nam trẻ trung sôi nổi", cmd: "/set giọng nam trẻ trung, năng động, sôi nổi" },
    { label: "Nữ uy lực quyết đoán", cmd: "/set giọng nữ trưởng thành, uy lực, quyết đoán" },
    { label: "Ông lão miền Tây từ tốn", cmd: "/set giọng ông lão miền Tây từ tốn, hiền hậu" },
    { label: "Bà lão miền Bắc cổ tích", cmd: "/set giọng bà lão miền Bắc kể chuyện cổ tích" },
  ];

  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans relative overflow-hidden flex flex-col selection:bg-app-accent/20">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-white" />
        <motion.div 
          animate={{ 
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-200/40 blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            opacity: [0.1, 0.15, 0.1],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-pink-200/30 blur-[100px]" 
        />
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        
        {/* Colorful Particles */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 100 + "%", 
                y: Math.random() * 100 + "%",
                opacity: 0.1
              }}
              animate={{ 
                y: ["0%", "-10%", "0%"],
                x: ["0%", "5%", "0%"],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{ 
                duration: 15 + Math.random() * 10, 
                repeat: Infinity, 
                ease: "linear",
                delay: Math.random() * 10
              }}
              className={`absolute w-4 h-4 rounded-full blur-[2px] ${i % 3 === 0 ? 'bg-blue-400/20' : i % 3 === 1 ? 'bg-pink-400/20' : 'bg-indigo-400/20'}`}
            />
          ))}
        </div>
      </div>

      <header className="h-20 lg:h-24 px-6 lg:px-10 border-b border-app-accent/5 flex items-center justify-between z-20 relative bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }}
            className="w-14 h-14 md:w-16 md:h-16 rounded-[22px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-app-accent/10 flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-app-accent/10 to-app-secondary/10" />
            <div className="relative">
              <BookOpen className="w-8 h-8 text-app-accent absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 opacity-20 blur-[1px]" />
              <Mic2 className="w-9 h-9 text-app-accent relative z-10" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-app-secondary rounded-full border-2 border-white animate-pulse shadow-md" />
            </div>
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-[10px] uppercase tracking-[4px] text-app-accent font-black">AI Voice Professional</h1>
            <h2 className="text-xl md:text-2xl font-serif font-black text-app-text tracking-tight uppercase">Văn bản thành giọng kể chuyện</h2>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-3 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] px-5 py-2.5 rounded-full border border-app-accent/5">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-[2px] text-app-accent font-black">Hệ thống sẵn sàng</span>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 p-4 lg:p-8 z-10 max-w-[1700px] mx-auto w-full overflow-hidden">
        {/* Narrative Viewport */}
        <motion.section 
          animate={{ 
            borderColor: isPlaying ? "rgba(59, 130, 246, 0.4)" : "rgba(0, 0, 0, 0.05)",
            boxShadow: isPlaying ? "0 20px 40px rgba(59, 130, 246, 0.1)" : "0 10px 40px rgba(0,0,0,0.04)"
          }}
          className="bg-white/80 border border-black/5 rounded-[32px] p-8 md:p-10 flex flex-col backdrop-blur-xl overflow-hidden min-h-[500px] shadow-xl relative"
        >
          {/* Overlay for generating */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center"
              >
                <SparklingParticles />
                <div className="bg-white p-10 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-blue-100 flex flex-col items-center gap-8 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 via-pink-400 to-blue-400 animate-pulse" />
                  <GeneratingWaves />
                  <div className="space-y-3">
                    <h3 className="text-2xl font-serif font-black text-app-text">Đang tạo giọng nói AI...</h3>
                    <p className="text-app-dim text-sm max-w-xs mx-auto">Vui lòng chờ trong giây lát, trí tuệ nhân tạo đang thổi hồn vào câu chuyện của bạn.</p>
                  </div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="p-3 rounded-full bg-blue-50"
                  >
                    <RefreshCw className="w-6 h-6 text-blue-500" />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-black/5 relative">
            <div className="absolute -bottom-px left-0 w-24 h-px bg-gradient-to-r from-app-accent to-transparent" />
            <div className="flex items-center gap-5 bg-black/[0.02] border border-black/5 px-5 py-2.5 rounded-2xl relative z-10 transition-all hover:bg-black/[0.04]">
              <div className="font-serif font-black text-2xl tracking-[1px] text-app-accent select-none uppercase">
                CONTENT
              </div>
              <span className="font-serif text-[10px] uppercase tracking-[2px] text-app-accent font-black mt-0.5 border-l border-black/10 pl-4">
                 {isGenerating ? "Đang xử lý" : "Kịch bản"}
              </span>
              
              <div className="h-6 w-[1px] bg-black/5 mx-2" />
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.pdf,.docx"
                className="hidden"
              />
              
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "#3B82F6", color: "#FFFFFF" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2.5 px-5 py-2 rounded-xl bg-app-accent/5 border border-app-accent/10 text-app-accent transition-all group shadow-sm font-black"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-app-accent" />
                ) : (
                  <FileUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                )}
                <span className="text-[10px] uppercase tracking-[1px] font-serif">TẢI TÀI LIỆU</span>
              </motion.button>
            </div>
            <div className="text-[10px] text-app-accent/60 font-mono tracking-widest font-black bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
              #{transcript.length.toString().padStart(4, '0')}
            </div>
          </div>
          
          <div className="relative flex-1 group overflow-hidden">
            {/* Syntax Highlighting Overlay */}
            <div 
              aria-hidden="true"
              className={`absolute inset-0 z-20 pointer-events-none whitespace-pre-wrap break-words font-serif leading-relaxed p-0 selection:bg-transparent overflow-y-auto custom-scrollbar ${getFontSizeClass()}`}
              style={{ padding: '0px' }}
              ref={(el) => {
                if (el && textareaRef.current) {
                  el.scrollTop = textareaRef.current.scrollTop;
                }
              }}
            >
              {transcript.split(/(\[.*?\])/).map((part, i) => {
                if (part.startsWith('[') && part.endsWith(']')) {
                  return (
                    <span 
                      key={i} 
                      className="inline-flex items-center text-app-secondary font-black rounded-lg bg-pink-50 border border-pink-100 px-1 py-0.5 pointer-events-auto group/tag cursor-default relative z-30 shadow-sm"
                    >
                      {part}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeTagAt(i);
                        }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/tag:opacity-100 bg-app-secondary text-white rounded-full p-1 transition-all pointer-events-auto scale-75 hover:scale-100 shadow-md z-40"
                        title="Xóa thẻ"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </span>
                  );
                }
                return <span key={i} className="text-app-text">{part}</span>;
              })}
              {transcript.endsWith('\n') && <br />}
            </div>

            <motion.textarea
              ref={textareaRef}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              spellCheck="false"
              autoComplete="off"
              onScroll={(e) => {
                const overlay = e.currentTarget.previousElementSibling;
                if (overlay) overlay.scrollTop = e.currentTarget.scrollTop;
              }}
              placeholder="Nhập kịch bản của bạn tại đây..."
              className={`w-full h-full bg-transparent border-none p-0 font-serif leading-relaxed text-transparent caret-app-accent focus:outline-none transition-all placeholder:text-gray-300 resize-none selection:bg-app-accent/20 custom-scrollbar overflow-y-auto relative z-10 ${getFontSizeClass()}`}
              style={{ 
                textShadow: "none", 
                color: "transparent",
                WebkitTextFillColor: "transparent",
                outline: "none",
                boxShadow: "none"
              }}
            />
          </div>

          <AnimatePresence>
            {vocalInstruction && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Mic2 className="w-4 h-4 text-app-accent flex-shrink-0" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-app-accent font-black truncate">
                    Đặc trưng: {vocalInstruction}
                  </span>
                </div>
                <button 
                  onClick={() => setVocalInstruction("")}
                  className="p-2 hover:bg-white rounded-xl transition-all text-app-dim hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Command Bar */}
          <div className="mt-8 pt-6 border-t border-black/5">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Zap className="w-3 h-3 text-app-accent" />
                </div>
                <span className="text-[10px] uppercase tracking-[2px] text-app-dim font-black">Lệnh nhanh</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowPresets(!showPresets);
                      setShowHelp(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shadow-sm ${showPresets ? 'bg-app-accent text-white font-black' : 'text-app-accent hover:bg-app-accent/5 bg-white border border-app-accent/10'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[9px] uppercase tracking-wider font-black">Thư viện mẫu</span>
                  </motion.button>
                  
                  <AnimatePresence>
                    {showPresets && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full right-0 mb-3 w-64 bg-white border border-black/5 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl z-50 overflow-hidden"
                      >
                        <div className="text-[9px] uppercase tracking-widest font-black text-app-dim mb-2 px-3 py-2 border-b border-black/5">Chọn kịch bản mẫu</div>
                        <div className="grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                          {COMMAND_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setCommand(preset.cmd);
                                setShowPresets(false);
                              }}
                              className="flex items-center justify-between text-left px-3 py-3 rounded-xl hover:bg-blue-50 group transition-all"
                            >
                              <span className="text-[11px] font-medium text-app-text group-hover:text-app-accent transition-colors">{preset.label}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-app-accent" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative ml-1">
                  <button 
                    onMouseEnter={() => setShowHelp(true)}
                    onMouseLeave={() => setShowHelp(false)}
                    onClick={() => {
                      setShowHelp(!showHelp);
                      setShowPresets(false);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-app-dim hover:text-app-accent hover:bg-white shadow-sm border border-transparent hover:border-black/5 transition-all"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                  
                  <AnimatePresence>
                    {showHelp && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-3 w-64 bg-white border border-black/5 rounded-2xl p-5 shadow-2xl backdrop-blur-xl z-50 pointer-events-none"
                      >
                        <h4 className="text-app-accent text-[11px] uppercase tracking-widest font-black mb-4 border-b border-black/5 pb-2">Hướng dẫn lệnh</h4>
                        <div className="space-y-4">
                          <div className="bg-blue-50/50 p-2 rounded-xl">
                            <code className="text-app-accent text-[10px] font-black">/voice [tên]</code>
                            <p className="text-app-dim text-[10px] mt-1 font-medium">Thay đổi giọng đọc nhanh</p>
                          </div>
                          <div className="bg-pink-50/50 p-2 rounded-xl">
                            <code className="text-app-secondary text-[10px] font-black">/set [mô tả]</code>
                            <p className="text-app-dim text-[10px] mt-1 font-medium">Gán đặc tính cảm xúc</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-xl">
                            <code className="text-app-text text-[10px] font-black">/clear</code>
                            <p className="text-app-dim text-[10px] mt-1 font-medium">Làm sạch kịch bản</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <form onSubmit={handleCommand} className="relative group/input">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-app-accent font-black text-sm select-none transition-transform group-focus-within/input:scale-110">
                {">"}
              </div>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Mô tả chất giọng hoặc dùng lệnh nhanh tại đây..."
                className="w-full bg-white border border-black/5 rounded-[22px] pl-10 pr-5 py-5 text-[13px] text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent/10 focus:border-app-accent/30 transition-all placeholder:text-gray-300 font-medium shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
              />
            </form>
          </div>
        </motion.section>

        {/* Controls Panel */}
        <aside className="flex flex-col gap-6 overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-app-accent shadow-[0_0_10px_rgba(59,130,246,0.4)]" />
              <span className="text-[11px] uppercase tracking-[3px] text-app-text font-black">CONTROL HUB 4.0</span>
            </div>
            <div className="px-3 py-1 bg-white rounded-full border border-black/5 text-[9px] text-app-dim font-black uppercase tracking-tighter shadow-sm">
              LIVE BROADCAST
            </div>
          </div>

          {/* Acting Tags Card */}
          <div className="bg-white border border-black/5 rounded-[32px] p-7 space-y-6 shadow-xl relative overflow-hidden group/tags transition-all hover:shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-200/20 blur-[60px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/10 blur-[50px] pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-[12px] uppercase tracking-[2px] text-app-text font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-50 border border-pink-100 shadow-sm">
                  <Layout className="w-5 h-5 text-app-secondary" />
                </div>
                Cảm xúc kịch bản
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={validateTags}
                  className={`px-4 py-2 rounded-xl transition-all shadow-sm font-black text-[10px] uppercase tracking-wider border ${
                    tagValidationReport ? "bg-app-secondary text-white border-app-secondary shadow-pink-200" : "bg-white hover:bg-gray-50 text-app-text border-black/5"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar relative z-10 p-1">
              {[
                { tag: "[warm]", desc: "Ấm p", icon: "🔥" },
                { tag: "[whisper]", desc: "Thì", icon: "👂" },
                { tag: "[tension]", desc: "Kịch", icon: "🌋" },
                { tag: "[joy]", desc: "Vui", icon: "✨" },
                { tag: "[sadness]", desc: "Sầu", icon: "💧" },
                { tag: "[anger]", desc: "Giận", icon: "⚡" },
                { tag: "[fear]", desc: "Sợ", icon: "🕯️" },
                { tag: "[mystery]", desc: "Lạ", icon: "🎭" },
                { tag: "[hát]", desc: "Hát", icon: "🎤" },
                { tag: "[cười lớn]", desc: "Cười lớn", icon: "😆" },
                { tag: "[cười khúc khích]", desc: "Khúc khích", icon: "🤭" },
                { tag: "[quát lớn]", desc: "Quát lớn", icon: "🗯️" },
                { tag: "[hào hứng]", desc: "Hào hứng", icon: "🤩" },
                { tag: "[nhẹ nhàng]", desc: "Nhẹ nhàng", icon: "🌬️" }
              ].map((item) => (
                <button
                  key={item.tag}
                  onClick={() => insertTag(item.tag)}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-black/5 bg-gray-50/50 hover:bg-white hover:border-app-accent hover:shadow-lg transition-all gap-2 group/btn active:scale-95 text-center"
                >
                  <span className="text-xl group-hover/btn:scale-125 transition-transform">{item.icon}</span>
                  <span className="text-[9px] font-black uppercase text-app-dim group-hover/btn:text-app-accent">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Settings Card */}
          <div className="bg-white border border-black/5 rounded-[32px] p-7 space-y-7 shadow-xl relative overflow-hidden transition-all hover:shadow-2xl flex-1">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-100/30 blur-[80px] pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-[12px] uppercase tracking-[2px] text-app-text font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 shadow-sm">
                  <Mic2 className="w-5 h-5 text-app-accent" />
                </div>
                Cấu hình giọng đọc
              </h3>
              <div className="p-1 px-3 bg-blue-50 rounded-full text-[9px] font-black text-app-accent uppercase tracking-tighter">
                Manual Control
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[2px] text-app-dim px-1">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" /> Thống kê giọng
                  </div>
                  <span className="text-app-accent">{speed}x / {pitch}pt</span>
                </div>
                <div className="space-y-6 bg-gray-50 p-5 rounded-3xl border border-black/5 shadow-inner">
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[9px] font-black uppercase text-app-dim/60">
                      <span>Tốc độ đọc</span>
                      <span className={speed > 1 ? "text-app-secondary" : "text-app-accent"}>{speed}x</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="2.0" step="0.1" value={speed} 
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-app-accent custom-range"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[9px] font-black uppercase text-app-dim/60">
                      <span>Tông giọng</span>
                      <span className={pitch > 0 ? "text-app-secondary" : "text-app-accent"}>{pitch}pt</span>
                    </div>
                    <input 
                      type="range" min="-20" max="20" step="1" value={pitch} 
                      onChange={(e) => setPitch(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-app-accent custom-range"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[2px] text-app-dim px-1">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" /> Thư viện nghệ sĩ
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar scroll-smooth">
                  {VOICES.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoiceId(voice.id)}
                      className={`flex items-center p-3.5 rounded-2xl border transition-all gap-4 relative overflow-hidden group/voice ${
                        selectedVoiceId === voice.id 
                          ? "bg-app-accent text-white border-app-accent shadow-lg shadow-blue-200" 
                          : "bg-white border-black/5 text-app-text hover:bg-gray-50 hover:border-app-accent/20"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-serif text-lg font-black transition-all ${
                        selectedVoiceId === voice.id ? "bg-white/20 scale-110" : "bg-blue-50 text-app-accent group-hover/voice:bg-app-accent/10"
                      }`}>
                        {voice.name[0]}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-black uppercase tracking-tight">{voice.name}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
                            selectedVoiceId === voice.id ? "bg-white/20" : "bg-gray-100 text-app-dim"
                          }`}>{voice.region}</span>
                        </div>
                        <p className={`text-[9px] mt-1 font-medium leading-tight ${selectedVoiceId === voice.id ? "text-white/70" : "text-app-dim"}`}>
                          {voice.description}
                        </p>
                      </div>
                      {selectedVoiceId === voice.id && (
                        <motion.div layoutId="active-voice" className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Player Card */}
          <div className={`mt-auto rounded-[32px] overflow-hidden flex flex-col transition-all duration-700 shadow-2xl border relative group/player ${
            audioUrl ? "bg-app-accent text-white border-app-accent shadow-blue-200" : "bg-white border-black/5 text-app-text"
          }`}>
            <div className="p-6 md:p-8 flex flex-col items-center gap-6 relative z-10">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[2px] font-black">
                  <div className={`w-2.5 h-2.5 rounded-full ${audioUrl ? "bg-white animate-pulse shadow-lg" : "bg-gray-200"}`} />
                  {isGenerating ? "Processing AI..." : audioUrl ? "Ready for playback" : "System Standby"}
                </div>
                {audioUrl && (
                  <div className="text-[11px] font-mono font-black opacity-80 bg-black/10 px-3 py-1 rounded-lg">
                    {formatTime(currentTime)} <span className="opacity-40 px-1">|</span> {formatTime(duration)}
                  </div>
                )}
              </div>

              {/* Action & Play Controls Row */}
              <div className="w-full flex gap-4">
                <button
                  disabled={isGenerating || !transcript.trim()}
                  onClick={handleGenerate}
                  className={`flex-1 py-4.5 rounded-2xl font-black tracking-[2px] uppercase text-[12px] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl relative overflow-hidden ${
                    audioUrl 
                      ? "bg-white text-app-accent hover:shadow-2xl active:bg-gray-50" 
                      : "bg-app-accent text-white hover:shadow-blue-300 disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none"
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                  {audioUrl ? "TÁI TẠO LẠI" : "BẮT ĐẦU CHUYỂN GIỌNG"}
                </button>

                {audioUrl && (
                  <button 
                    onClick={togglePlay}
                    className="w-16 h-16 rounded-2xl bg-white text-app-accent flex items-center justify-center hover:scale-105 transition-all active:scale-95 shadow-xl border border-white/20"
                  >
                    {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                  </button>
                )}
              </div>

              {/* Audio Progress & Export Row */}
              <AnimatePresence>
                {audioUrl && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="w-full space-y-5"
                  >
                    <div className="relative pt-2">
                       <input 
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={currentTime}
                        onChange={(e) => {
                          const time = parseFloat(e.target.value);
                          if (audioRef.current) audioRef.current.currentTime = time;
                          setCurrentTime(time);
                        }}
                        className="w-full h-1.5 bg-black/10 rounded-full appearance-none cursor-pointer accent-white hover:accent-gray-100 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative group/sel">
                        <select 
                          value={downloadFormat}
                          onChange={(e) => setDownloadFormat(e.target.value as any)}
                          className="w-full bg-black/10 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white focus:outline-none cursor-pointer hover:bg-black/20 transition-all appearance-none"
                        >
                          <option value="mp3">Format: MP3</option>
                          <option value="wav">Format: WAV</option>
                          <option value="flac">Format: FLAC</option>
                          <option value="aac">Format: AAC</option>
                          <option value="ogg">Format: OGG</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronRight className="w-3.5 h-3.5 rotate-90 opacity-40" />
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <select 
                          value={downloadBitrate}
                          disabled={downloadFormat !== 'mp3'}
                          onChange={(e) => setDownloadBitrate(parseInt(e.target.value))}
                          className="flex-1 bg-black/10 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white focus:outline-none cursor-pointer hover:bg-black/20 transition-all disabled:opacity-30 appearance-none text-center"
                        >
                          <option value="128">128kbps</option>
                          <option value="192">192kbps</option>
                          <option value="320">320kbps</option>
                        </select>
                        <button 
                          onClick={() => setIsStereoExport(!isStereoExport)}
                          className={`w-14 rounded-xl border border-white/10 text-[9px] font-black uppercase transition-all ${isStereoExport ? 'bg-white text-app-accent' : 'bg-black/10 text-white'}`}
                        >
                          {isStereoExport ? "STE" : "MON"}
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleDownload}
                      className="w-full py-4 rounded-xl bg-white text-app-accent hover:shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/20"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-[3px]">TẢI XUỐNG BẢN THU</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {audioUrl && (
                <audio 
                  ref={audioRef}
                  key={audioUrl}
                  src={audioUrl} 
                  onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                  onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              )}
            </div>
          </div>
        </aside>
      </main>

      <footer className="h-14 px-6 lg:px-10 border-t border-black/5 flex items-center justify-between text-[10px] text-app-dim uppercase tracking-[3px] z-10 bg-white/60 backdrop-blur-md">
        <div className="hidden lg:flex gap-10 font-black">
          <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-500" /> Latency: 180ms</span>
          <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-pink-500" /> High-Res: 48kHz</span>
          <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500" /> AI Engine: v4.1</span>
        </div>
        
        <div className="flex-1 flex justify-center lg:justify-end gap-8 items-center">
          <div className="text-[14px] tracking-normal uppercase font-serif text-app-text font-black">
            MADE WITH ❤️ BY <a href="https://tranthanhphucbvdkgr.bio.link" target="_blank" rel="noopener noreferrer" className="text-app-accent hover:underline decoration-blue-200">TRẦN THANH PHÚC</a>
          </div>
          <span className="flex items-center gap-2 text-app-accent font-black">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            LIVE
          </span>
        </div>
      </footer>

      {/* Modern Notification Toast */}
      <AnimatePresence>
        {(error || commandFeedback) && (
          <motion.div 
            key="notification-toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.15)] flex items-center gap-6 min-w-[380px] border backdrop-blur-2xl ${
              error ? 'bg-red-50/95 border-red-100 text-red-900' : 'bg-white/95 border-blue-100 text-app-text'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${error ? 'bg-red-100' : 'bg-blue-50'}`}>
              {error ? <AlertCircle className="w-6 h-6 text-red-600" /> : <Sparkles className="w-6 h-6 text-app-accent" />}
            </div>
            
            <div className="flex-1">
              <div className={`text-[10px] uppercase tracking-widest font-black mb-1 opacity-60`}>
                {error ? 'Hệ thống báo lỗi' : 'Hệ thống ghi nhận'}
              </div>
              <div className="text-[14px] font-bold leading-tight">
                {error || commandFeedback}
              </div>
            </div>
            
            <button 
              onClick={() => {
                setError(null);
                setCommandFeedback(null);
              }}
              className="p-2 hover:bg-black/5 rounded-xl transition-all"
            >
              <X className="w-5 h-5 opacity-40 hover:opacity-100" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
