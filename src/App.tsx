/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  Play, 
  Pause,
  Square, 
  Download, 
  Loader2, 
  BookOpen, 
  Volume2, 
  Mic2, 
  RefreshCw,
  Info,
  Plus,
  Trash2,
  Save,
  Star,
  FileUp,
  FileText,
  HelpCircle,
  Sparkles,
  ChevronRight,
  X,
  ShieldCheck,
  Wand2,
  Zap,
  Activity,
  CloudRain,
  Wind,
  Bird,
  Waves,
  Coffee,
  Trees,
  Flame,
  CloudLightning,
  Building2,
  TrainFront,
  LibraryBig,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import * as lamejs from "lamejs";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";

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
  "romantic", "energetic", "singing", "humming", "melodic", "vocal", "scream", "laugh"
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
    const systemDirective = "BẠN LÀ MỘT DIỄN VIÊN LỒNG TIẾNG CHUYÊN NGHIỆP CẤP CAO. Bạn phải thực hiện các chỉ dẫn cảm xúc đặt trong ngoặc vuông như [joy], [shout], [scream], [laugh], [whisper], [vocal], [formal]... bằng cách thay đổi tông giọng, tốc độ nói và hơi thở ngay lập tức. TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỌC CÁC TỪ TRONG NGOẶC VUÔNG. CHỈ ĐỌC VĂN BẢN. Bạn phải tuân thủ nghiêm ngặt các chỉ số Tốc độ và Tông giọng được yêu cầu.";
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
    <div className="flex flex-col min-h-screen bg-nocturne-bg text-nocturne-text font-sans relative">
      {/* Global Header */}
      <header className="z-20 px-6 lg:px-12 pt-8 pb-4 flex items-center justify-between max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-6">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-nocturne-accent/30 bg-gradient-to-br from-nocturne-bg to-zinc-900 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(225,169,95,0.2)] relative group"
          >
            <div className="absolute inset-0 bg-nocturne-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <BookOpen className="w-8 h-8 text-nocturne-accent absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 opacity-20 blur-[1px]" />
              <Mic2 className="w-9 h-9 text-nocturne-accent relative z-10 drop-shadow-[0_0_8px_rgba(225,169,95,0.5)]" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-nocturne-accent rounded-full border-2 border-nocturne-bg animate-pulse" />
            </div>
          </motion.div>
          <div className="space-y-1.5">
            <h1 className="text-[11px] uppercase tracking-[6px] text-nocturne-accent/90 font-black">Professional text-to-speech conversion</h1>
            <h2 className="text-xl md:text-2xl font-serif italic text-white uppercase tracking-[2px] drop-shadow-sm">Văn bản thành giọng kể chuyện</h2>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] uppercase tracking-[2px] text-nocturne-dim font-bold">Máy chủ sẵn sàng</span>
        </div>
      </header>

      {/* Atmospheric Gradients & Grain */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <motion.div 
          animate={{ 
            opacity: isPlaying ? [0.12, 0.2, 0.12] : 0.12,
            scale: isPlaying ? [1, 1.05, 1] : 1
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(225,169,95,0.2)_0%,transparent_60%)]" 
        />
        <motion.div 
          animate={{ 
            opacity: isPlaying ? [0.15, 0.25, 0.15] : 0.15,
            scale: isPlaying ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(60,80,110,0.3)_0%,transparent_60%)]" 
        />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        
        {/* Floating Particles/Dust */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 100 + "%", 
                y: Math.random() * 100 + "%",
                opacity: Math.random() * 0.3
              }}
              animate={{ 
                y: ["0%", "-20%", "0%"],
                opacity: isPlaying ? [0.1, 0.4, 0.1] : [0.1, 0.2, 0.1],
                scale: isPlaying ? [1, 1.5, 1] : 1
              }}
              transition={{ 
                duration: 10 + Math.random() * 20, 
                repeat: Infinity, 
                ease: "linear",
                delay: Math.random() * 10
              }}
              className="absolute w-1 h-1 bg-nocturne-accent/30 rounded-full blur-[1px]"
            />
          ))}
        </div>
      </div>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 p-4 lg:p-8 z-10 max-w-[1700px] mx-auto w-full overflow-hidden">
        {/* Narrative Viewport */}
        <motion.section 
          animate={{ 
            borderColor: isPlaying ? "rgba(225, 169, 95, 0.4)" : "rgba(255, 255, 255, 0.05)",
            boxShadow: isPlaying ? "0 0 50px rgba(225, 169, 95, 0.15)" : "0 20px 60px rgba(0,0,0,0.6)"
          }}
          className="bg-nocturne-glass border border-nocturne-glass-border rounded-[28px] p-8 md:p-10 flex flex-col backdrop-blur-2xl overflow-hidden min-h-[500px] shadow-2xl relative"
        >
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5 relative">
            <div className="absolute -bottom-px left-0 w-24 h-px bg-gradient-to-r from-nocturne-accent to-transparent" />
            <div className="flex items-center gap-5 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-2xl relative z-10">
              <div className="font-serif font-black text-2xl tracking-[2px] text-nocturne-accent select-none uppercase">
                NỘI DUNG
              </div>
              <span className="font-serif text-[10px] uppercase tracking-[2px] text-nocturne-accent font-black mt-0.5 border-l border-white/10 pl-4">
                 {isGenerating ? "Đang xử lý..." : "Kịch bản"}
              </span>
              
              <div className="h-6 w-[1px] bg-white/5 mx-2" />
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.pdf,.docx"
                className="hidden"
              />
              
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(225, 169, 95, 0.15)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-nocturne-accent/10 border border-nocturne-accent/20 text-nocturne-accent transition-all group shadow-lg active:shadow-none"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                )}
                <span className="text-[10px] uppercase tracking-[1.5px] font-serif font-black">TẢI TÀI LIỆU</span>
              </motion.button>
            </div>
            <div className="text-[10px] text-nocturne-accent/60 font-mono tracking-widest font-bold">
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
                      className="inline-flex items-center text-nocturne-accent font-bold rounded bg-nocturne-accent/10 drop-shadow-[0_0_8px_rgba(225,169,95,0.4)] pointer-events-auto group/tag cursor-default relative z-30"
                    >
                      {part}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeTagAt(i);
                        }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/tag:opacity-100 bg-red-500 text-white rounded-full p-1 transition-all pointer-events-auto scale-75 hover:scale-100 shadow-[0_0_15px_rgba(239,68,68,0.5)] z-40"
                        title="Xóa thẻ"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                }
                return <span key={i} className="text-white">{part}</span>;
              })}
              {/* Ensure whitespace at the end is visible */}
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
              animate={{ 
                opacity: isPlaying ? [0.6, 1, 0.6] : 1,
              }}
              transition={{ duration: 4, repeat: isPlaying ? Infinity : 0, ease: "easeInOut" }}
              className={`w-full h-full bg-transparent border-none p-0 font-serif leading-relaxed text-transparent caret-white focus:outline-none transition-all placeholder:text-stone-800 resize-none selection:bg-nocturne-accent/20 custom-scrollbar overflow-y-auto relative z-10 ${getFontSizeClass()}`}
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
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3 bg-nocturne-accent/5 rounded-lg border border-nocturne-accent/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Mic2 className="w-3 h-3 text-nocturne-accent flex-shrink-0" />
                  <span className="text-[10px] uppercase tracking-wider text-nocturne-accent/70 font-bold truncate">
                    Đặc trưng: {vocalInstruction}
                  </span>
                </div>
                <button 
                  onClick={() => setVocalInstruction("")}
                  className="text-nocturne-dim hover:text-nocturne-accent p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Command Bar */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-nocturne-accent/40" />
                <span className="text-[9px] uppercase tracking-[2px] text-nocturne-dim font-bold">Dòng lệnh</span>
              </div>
              
              <div className="flex items-center gap-1">
                <div className="relative">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setShowPresets(!showPresets);
                      setShowHelp(false);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${showPresets ? 'bg-nocturne-accent text-black text-[9px] font-bold' : 'text-nocturne-dim hover:text-nocturne-accent bg-white/5'}`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[8px] uppercase tracking-wider font-bold">Mẫu</span>
                  </motion.button>
                  
                  <AnimatePresence>
                    {showPresets && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full right-0 mb-3 w-56 bg-black/95 border border-nocturne-accent/40 rounded-xl p-2 shadow-2xl backdrop-blur-2xl z-50 overflow-hidden"
                      >
                        <div className="text-[9px] uppercase tracking-widest font-bold text-nocturne-accent/60 mb-2 px-2 py-1 border-b border-white/5">Chọn mẫu giọng</div>
                        <div className="grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {COMMAND_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setCommand(preset.cmd);
                                setShowPresets(false);
                              }}
                              className="flex items-center justify-between text-left px-3 py-2.5 rounded-lg hover:bg-nocturne-accent/10 group transition-all"
                            >
                              <span className="text-[10px] text-zinc-300 group-hover:text-nocturne-accent transition-colors">{preset.label}</span>
                              <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-nocturne-accent" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative border-l border-white/10 pl-1 ml-1">
                  <button 
                    onMouseEnter={() => setShowHelp(true)}
                    onMouseLeave={() => setShowHelp(false)}
                    onClick={() => {
                      setShowHelp(!showHelp);
                      setShowPresets(false);
                    }}
                    className="text-nocturne-dim hover:text-nocturne-accent transition-colors p-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                  
                  <AnimatePresence>
                    {showHelp && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full right-0 mb-3 w-64 bg-black/90 border border-nocturne-accent/30 rounded-xl p-4 shadow-2xl backdrop-blur-xl z-50 pointer-events-none"
                      >
                        <h4 className="text-nocturne-accent text-[10px] uppercase tracking-widest font-bold mb-3 border-b border-white/10 pb-2">Hướng dẫn dòng lệnh</h4>
                        <div className="space-y-3">
                          <div>
                            <code className="text-white text-[10px] bg-white/10 px-1 rounded">/voice [tên]</code>
                            <p className="text-nocturne-dim text-[9px] mt-1 italic">Thay đổi giọng đọc (vd: /voice puck)</p>
                          </div>
                          <div>
                            <code className="text-white text-[10px] bg-white/10 px-1 rounded">/set [mô tả]</code>
                            <p className="text-nocturne-dim text-[9px] mt-1 italic">Thiết lập đặc trưng giọng (vd: /set giọng ấm)</p>
                          </div>
                          <div>
                            <code className="text-white text-[10px] bg-white/10 px-1 rounded">/clear</code>
                            <p className="text-nocturne-dim text-[9px] mt-1 italic">Xóa toàn bộ nội dung kịch bản</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <form onSubmit={handleCommand} className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-nocturne-accent/50 text-sm font-mono tracking-tighter select-none">
                {">"}
              </div>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Mô tả giọng nói (ví dụ: giọng miền Nam, nam bộ, tự nhiên, rõ ràng,...)"
                className="w-full bg-black/30 border border-white/5 rounded-xl pl-10 pr-4 py-4 text-sm text-nocturne-text focus:outline-none focus:border-nocturne-accent/50 transition-all placeholder:text-stone-700 font-mono shadow-inner"
              />
            </form>
          </div>
        </motion.section>

        {/* Controls Panel */}
        <aside className="flex flex-col gap-4 overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-nocturne-accent shadow-[0_0_8px_rgba(225,169,95,0.5)]" />
              <span className="text-[9px] uppercase tracking-[2px] text-nocturne-dim font-bold">NOCTURNE v3.1</span>
            </div>
            <div className="text-[8px] text-nocturne-dim font-mono opacity-50 uppercase tracking-tighter">
              {new Date().toLocaleDateString('vi-VN')}
            </div>
          </div>

          {/* Acting Tags Card */}
          <div className="bg-white/[0.04] border border-white/10 rounded-[24px] p-6 space-y-5 shadow-2xl relative overflow-hidden group/tags transition-all hover:bg-white/[0.06] hover:border-white/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-nocturne-accent/5 blur-[60px] pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-[12px] uppercase tracking-[2px] text-nocturne-text font-black flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-nocturne-accent/10 border border-nocturne-accent/20">
                  <BookOpen className="w-4 h-4 text-nocturne-accent" />
                </div>
                Thẻ diễn xuất
              </h3>
              <div className="flex gap-2.5">
                {tagValidationReport && (
                  <button 
                    onClick={() => setTagValidationReport(null)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all shadow-lg active:scale-90 border border-red-500/20"
                    title="Đóng báo cáo lỗi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={validateTags}
                  className={`p-2 rounded-xl transition-all shadow-lg active:scale-90 border ${
                    tagValidationReport ? "bg-nocturne-accent text-nocturne-bg border-nocturne-accent" : "bg-white/5 hover:bg-nocturne-accent/20 text-nocturne-dim hover:text-nocturne-accent border-white/5 hover:border-nocturne-accent/30"
                  }`}
                  title="Kiểm tra thẻ chi tiết"
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => insertTag("[pause]")}
                  className="text-[9px] bg-nocturne-accent/10 border border-nocturne-accent/20 text-nocturne-accent px-3 py-1.5 rounded-xl font-mono font-bold hover:bg-nocturne-accent text-nocturne-bg transition-all uppercase tracking-wider shadow-lg"
                >
                  Hết hơi
                </button>
              </div>
            </div>

            <AnimatePresence>
              {tagValidationReport && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 mb-4 space-y-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" />
                      Phát hiện lỗi thẻ
                    </h4>
                  </div>

                  <div className="space-y-2.5">
                    {tagValidationReport.unknown.map((err, i) => (
                      <div key={i} className="bg-black/20 p-2 rounded-lg border border-white/5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white/80 font-mono text-[10px] line-through decoration-red-500/50">{err.tag}</span>
                          <span className="text-[9px] text-nocturne-dim uppercase font-bold">Không xác định</span>
                        </div>
                        {err.suggestion && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-[9px] text-green-500/70 uppercase font-black">Gợi ý:</span>
                            <button 
                              onClick={() => {
                                setTranscript(transcript.replace(err.tag, err.suggestion!));
                                setTagValidationReport({
                                  ...tagValidationReport,
                                  unknown: tagValidationReport.unknown.filter((_, idx) => idx !== i)
                                });
                              }}
                              className="text-green-500 font-mono text-[10px] hover:underline"
                            >
                              {err.suggestion}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {tagValidationReport.malformed.map((err, i) => (
                      <div key={i} className="bg-black/20 p-2 rounded-lg border border-red-500/20">
                        <p className="text-red-400 text-[10px] font-medium">{err}</p>
                      </div>
                    ))}

                    {tagValidationReport.duplicate.map((tag, i) => (
                      <div key={i} className="bg-black/20 p-2 rounded-lg border border-white/5 opacity-60">
                        <div className="flex items-center justify-between">
                          <span className="text-white/50 font-mono text-[10px]">{tag}</span>
                          <span className="text-[8px] text-nocturne-dim uppercase font-bold tracking-tighter">Lặp lại</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => {
                      let cleaned = transcript;
                      tagValidationReport.unknown.forEach(u => cleaned = cleaned.replace(u.tag, ""));
                      cleaned = cleaned.replace(/\s\s+/g, ' ').trim();
                      setTranscript(cleaned);
                      setTagValidationReport(null);
                      setCommandFeedback("Đã tự động dọn dẹp các thẻ lỗi.");
                    }}
                    className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-red-500/30"
                  >
                    Dọn dẹp tất cả lỗi
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar relative z-10">
              {[
                { tag: "[warm]", desc: "Ấm" },
                { tag: "[whisper]", desc: "Thì thầm" },
                { tag: "[tension]", desc: "Kịch" },
                { tag: "[joy]", desc: "Vui" },
                { tag: "[sadness]", desc: "Sầu" },
                { tag: "[anger]", desc: "Giận" },
                { tag: "[fear]", desc: "Sợ" },
                { tag: "[mystery]", desc: "Lạ" },
                { tag: "[formal]", desc: "Trang" },
                { tag: "[mellow]", desc: "Cảm" },
                { tag: "[breath]", desc: "Hơi" },
                { tag: "[pause]", desc: "Nghỉ" },
                { tag: "[southern]", desc: "Rặt" },
                { tag: "[shout]", desc: "Quát" },
                { tag: "[scream]", desc: "Hét" },
                { tag: "[laugh]", desc: "Cười" },
                { tag: "[cold]", desc: "Lạnh" },
                { tag: "[sarcastic]", desc: "Mỉa" },
                { tag: "[romantic]", desc: "Iu" },
                { tag: "[energetic]", desc: "Sung" },
                { tag: "[singing]", desc: "Hát" },
                { tag: "[humming]", desc: "Ngâm" },
                { tag: "[melodic]", desc: "Nhạc" },
                { tag: "[vocal]", desc: "Ca" },
              ].map((t) => (
                <button 
                  key={t.tag}
                  onClick={() => insertTag(t.tag)}
                  className="bg-white/[0.03] border border-white/10 p-2 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-nocturne-accent hover:border-nocturne-accent transition-all group active:scale-95 shadow-md hover:shadow-nocturne-accent/20"
                >
                  <span className="text-nocturne-accent group-hover:text-black text-[10px] font-mono font-bold tracking-tighter truncate w-full text-center">{t.tag.replace('[', '').replace(']', '')}</span>
                  <span className="text-[8px] text-nocturne-dim group-hover:text-black/80 font-bold uppercase tracking-tighter truncate w-full text-center">{t.desc}</span>
                </button>
              ))}
            </div>
            
            <div className="pt-3 border-t border-white/5 flex items-center justify-between relative z-10">
              <div className="text-[9px] text-nocturne-dim italic font-medium">
                * Chạm để chèn thẻ vào vị trí con trỏ
              </div>
              <div className="text-[9px] bg-nocturne-accent/5 border border-nocturne-accent/10 px-2 py-0.5 rounded-lg text-nocturne-accent font-mono opacity-60">
                PROMPT_V3
              </div>
            </div>
          </div>

          {/* Voice Config Card */}
          <div className="bg-white/[0.04] border border-white/10 rounded-[28px] p-6 space-y-5 shadow-2xl relative overflow-hidden group/voice transition-all hover:bg-white/[0.05]">
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/5 blur-[80px] pointer-events-none" />
            <h3 className="text-[12px] uppercase tracking-[2px] text-nocturne-text font-black flex items-center gap-3 relative z-10">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                <Volume2 className="w-4 h-4 text-nocturne-accent" />
              </div>
              Giọng đọc
            </h3>
            
            {/* Speed & Pitch Controls */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/10 relative z-10">
              <div className="space-y-4 p-4 rounded-[20px] bg-white/[0.02] border border-white/5 hover:border-nocturne-accent/30 transition-all group/speed shadow-inner">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-nocturne-dim font-black">
                  <div className="flex items-center gap-2 grayscale group-hover/speed:grayscale-0 transition-all">
                    <Zap className="w-3.5 h-3.5 text-nocturne-accent" />
                    <span>Tốc độ</span>
                  </div>
                  <span className="bg-nocturne-accent/10 border border-nocturne-accent/20 text-nocturne-accent px-2 py-0.5 rounded-lg text-[10px] min-w-[36px] text-center font-mono">{speed}x</span>
                </div>
                <input 
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-nocturne-accent transition-all hover:h-1.5"
                />
              </div>
              <div className="space-y-4 p-4 rounded-[20px] bg-white/[0.02] border border-white/5 hover:border-nocturne-accent/30 transition-all group/pitch shadow-inner">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-nocturne-dim font-black">
                   <div className="flex items-center gap-2 grayscale group-hover/pitch:grayscale-0 transition-all">
                    <Activity className="w-3.5 h-3.5 text-nocturne-accent" />
                    <span>Độ cao</span>
                  </div>
                  <span className="bg-nocturne-accent/10 border border-nocturne-accent/20 text-nocturne-accent px-2 py-0.5 rounded-lg text-[10px] min-w-[36px] text-center font-mono">{pitch > 0 ? `+${pitch}` : pitch}</span>
                </div>
                <input 
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={pitch}
                  onChange={(e) => setPitch(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-nocturne-accent transition-all hover:h-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar scroll-smooth relative z-10">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoiceId(v.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all border group relative overflow-hidden ${
                    selectedVoiceId === v.id 
                      ? "bg-nocturne-accent/15 border-nocturne-accent/40 text-nocturne-accent shadow-[0_0_20px_rgba(225,169,95,0.1)]" 
                      : "bg-white/[0.01] border-transparent text-nocturne-dim hover:bg-white/[0.04] hover:border-white/10"
                  }`}
                >
                  {selectedVoiceId === v.id && (
                    <motion.div 
                      layoutId="active-voice-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-nocturne-accent"
                    />
                  )}
                  
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                    selectedVoiceId === v.id ? "border-nocturne-accent bg-nocturne-accent/10" : "border-white/10 group-hover:border-white/30"
                  }`}>
                    <span className="text-[10px] font-bold">{v.region}</span>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <div className="text-[13px] font-bold tracking-tight truncate">{v.name}</div>
                       <span className={`text-[7px] px-1 py-0.5 rounded border uppercase transition-colors ${
                         selectedVoiceId === v.id ? 'bg-nocturne-accent/20 border-nocturne-accent/30' : 'bg-white/5 border-white/10 opacity-60'
                       }`}>{v.region}</span>
                    </div>
                    <div className="text-[9px] leading-tight opacity-40 line-clamp-1 italic group-hover:opacity-60 transition-opacity">
                      {v.description}
                    </div>
                  </div>
                  
                  {selectedVoiceId === v.id && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-nocturne-accent shadow-[0_0_10px_rgba(225,169,95,0.8)]"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Player Card (Compact) */}
          <div className={`mt-auto rounded-[28px] overflow-hidden flex flex-col transition-all duration-700 shadow-[0_30px_100px_rgba(0,0,0,0.8)] border relative group/player ${
            audioUrl ? "bg-nocturne-accent text-black border-nocturne-accent/40" : "bg-white/[0.04] border-white/10 text-nocturne-dim"
          }`}>
            <div className="p-5 md:p-6 flex flex-col items-center gap-5 relative z-10">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[2px] font-black">
                  <div className={`w-2 h-2 rounded-full ${audioUrl ? "bg-black animate-pulse shadow-[0_0_12px_rgba(0,0,0,0.6)]" : "bg-white/30"}`} />
                  {isGenerating ? "Processing..." : audioUrl ? "Ready" : "Standby"}
                </div>
                {audioUrl && (
                  <div className="text-[10px] font-mono font-black opacity-70">
                    {formatTime(currentTime)} <span className="opacity-40 px-1">/</span> {formatTime(duration)}
                  </div>
                )}
              </div>

              {/* Action & Play Controls Row */}
              <div className="w-full flex gap-3">
                <button
                  disabled={isGenerating || !transcript.trim()}
                  onClick={handleGenerate}
                  className={`flex-1 py-4 rounded-2xl font-black tracking-[2px] uppercase text-[11px] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden ${
                    audioUrl 
                      ? "bg-black text-nocturne-accent hover:opacity-90 active:bg-zinc-900" 
                      : "bg-nocturne-accent text-black hover:shadow-nocturne-accent/40 disabled:bg-white/5 disabled:text-white/10 disabled:shadow-none"
                  }`}
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className={`w-4 h-4 ${audioUrl ? "text-nocturne-accent" : "text-black"}`} />
                  )}
                  {audioUrl ? "Tái tạo" : "Chuyển giọng"}
                </button>

                {audioUrl && (
                  <button 
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-2xl bg-black text-nocturne-accent flex items-center justify-center hover:scale-105 transition-all active:scale-90 shadow-2xl border border-black/20"
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>
                )}
              </div>

              {/* Audio Progress & Export Row (Only when ready) */}
              <AnimatePresence>
                {audioUrl && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="w-full space-y-3"
                  >
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
                      className="w-full h-1 bg-black/20 rounded-full appearance-none cursor-pointer accent-black hover:accent-black/80 transition-all custom-range"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <select 
                        value={downloadFormat}
                        onChange={(e) => setDownloadFormat(e.target.value as any)}
                        className="w-full bg-black/10 border border-black/5 rounded-lg px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-black focus:outline-none cursor-pointer hover:bg-black/20 transition-all appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(0,0,0,0.4)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '8px' }}
                      >
                        <option value="mp3">MP3</option>
                        <option value="wav">WAV</option>
                        <option value="flac">FLAC</option>
                        <option value="aac">AAC</option>
                        <option value="ogg">OGG</option>
                      </select>
                      
                      <div className="flex gap-1">
                        <select 
                          value={downloadBitrate}
                          disabled={downloadFormat !== 'mp3'}
                          onChange={(e) => setDownloadBitrate(parseInt(e.target.value))}
                          className="flex-1 bg-black/10 border border-black/5 rounded-lg px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-black focus:outline-none cursor-pointer hover:bg-black/20 transition-all disabled:opacity-30 appearance-none"
                        >
                          <option value="128">128k</option>
                          <option value="192">192k</option>
                          <option value="320">320k</option>
                        </select>
                        <button 
                          onClick={() => setIsStereoExport(!isStereoExport)}
                          className={`w-full rounded-lg border text-[8px] font-bold uppercase transition-all py-1.5 ${isStereoExport ? 'bg-black text-nocturne-accent border-black' : 'bg-black/5 text-black/40 border-black/5'}`}
                          title={isStereoExport ? "Stereo" : "Mono"}
                        >
                          {isStereoExport ? "Stereo Mode" : "Mono Mode"}
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleDownload}
                      className="w-full py-2.5 rounded-lg bg-black text-nocturne-accent hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md border border-white/10"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-[2px]">Tải về</span>
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

      <footer className="h-12 px-6 lg:px-10 border-t border-white/5 flex items-center justify-between text-[9px] text-nocturne-dim uppercase tracking-[3px] z-10 bg-nocturne-bg/50 backdrop-blur-sm">
        <div className="hidden lg:flex gap-10">
          <span>Độ trễ: 240ms</span>
          <span>Tần số: 24kHz</span>
          <span>Định dạng: L16 PCM / MP3</span>
        </div>
        
        <div className="flex-1 flex justify-center lg:justify-end gap-6 items-center">
          <div className="text-[14px] tracking-normal uppercase first-letter:uppercase text-yellow-400">
            Ứng dụng AI được tạo bởi <a href="https://tranthanhphucbvdkgr.bio.link" target="_blank" rel="noopener noreferrer" className="text-red-500 font-black hover:underline active:text-red-700">Trần Thanh Phúc</a>
          </div>
          <span className="flex items-center gap-1.5 text-nocturne-accent">
            <div className="w-1.5 h-1.5 rounded-full bg-nocturne-accent animate-pulse" />
            Trạng thái: Hoạt động
          </span>
        </div>
      </footer>

      {/* Unified Notification Toast */}
      <AnimatePresence>
        {(error || commandFeedback) && (
          <motion.div 
            key="notification-toast"
            initial={{ opacity: 0, y: 100, x: "-50%", scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }} 
            exit={{ opacity: 0, y: 50, x: "-50%", scale: 0.9 }}
            className="fixed bottom-10 left-1/2 z-[100] px-6 py-4 rounded-2xl border backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 min-w-[340px] max-w-[90vw]"
            style={{ 
              backgroundColor: error ? 'rgba(127, 29, 29, 0.95)' : 'rgba(15, 15, 15, 0.95)',
              borderColor: error ? 'rgba(239, 68, 68, 0.4)' : 'rgba(225, 169, 95, 0.4)'
            }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${error ? 'bg-red-500/20' : 'bg-nocturne-accent/20'}`}>
              {error ? <Info className="w-5 h-5 text-red-400" /> : <Sparkles className="w-5 h-5 text-nocturne-accent" />}
            </div>
            
            <div className="flex-1 min-w-0 pr-4">
              <div className={`text-[10px] uppercase tracking-widest font-black mb-1 ${error ? 'text-red-400' : 'text-nocturne-accent'}`}>
                {error ? 'Lỗi hệ thống' : 'Thông báo'}
              </div>
              <div className="text-white text-[13px] font-medium line-clamp-2 leading-tight">
                {error || commandFeedback}
              </div>
            </div>
            
            <button 
              onClick={() => {
                setError(null);
                setCommandFeedback(null);
              }}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
            >
              <X className="w-4.5 h-4.5 text-white/70" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
