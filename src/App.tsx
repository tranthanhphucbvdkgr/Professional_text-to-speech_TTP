/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Play, 
  Pause,
  Download, 
  Loader2, 
  BookOpen, 
  Mic2, 
  RefreshCw,
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
  Layers,
  CheckCircle2,
  Sliders,
  FileText,
  Volume2,
  Eye,
  Edit3,
  Check,
  Search,
  Filter,
  User,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import * as lamejs from "lamejs";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// --- Visual Waves Animation Component ---
const GeneratingWaves = () => (
  <div className="flex items-end justify-center gap-1.5 h-16 w-full">
    {[...Array(15)].map((_, i) => (
      <motion.div
        key={i}
        animate={{
          height: [12, 54, 18, 44, 12],
        }}
        transition={{
          duration: 1.1,
          repeat: Infinity,
          delay: i * 0.08,
          ease: "easeInOut"
        }}
        className={`w-2 rounded-full shadow-md ${i % 2 === 0 ? 'bg-blue-500' : 'bg-pink-500'}`}
      />
    ))}
  </div>
);

// Setup PDF.js worker safely
try {
  const version = (pdfjsLib as any).version || '5.6.205';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn("PDF worker initialization warning:", e);
}

// Types
type VoiceName = 'Charon' | 'Puck' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface VoiceOption {
  id: string;
  baseVoice: VoiceName;
  name: string;
  gender: 'Nam' | 'Nữ';
  region: 'Bắc' | 'Trung' | 'Nam';
  description: string;
  instruction: string;
}

export const VOICES: VoiceOption[] = [
  // Miền Nam
  { 
    id: 'nam-charon', 
    baseVoice: 'Charon', 
    name: 'Thanh Sang', 
    gender: 'Nam', 
    region: 'Nam', 
    description: 'Giọng nam miền Nam, trầm ấm, truyền cảm, phong thái tự sự', 
    instruction: 'Giọng nam miền Nam chuẩn, phong thái rành mạch, ấm áp, sâu lắng.' 
  },
  { 
    id: 'nam-kore', 
    baseVoice: 'Kore', 
    name: 'Minh Nguyệt', 
    gender: 'Nữ', 
    region: 'Nam', 
    description: 'Giọng nữ miền Nam, ngọt ngào, nhẹ nhàng, chuyên kể tâm lý', 
    instruction: 'Giọng nữ miền Nam nhẹ nhàng, đôn hậu, truyền cảm, tự nhiên.' 
  },
  { 
    id: 'nam-ongnam', 
    baseVoice: 'Charon', 
    name: 'Ông Năm', 
    gender: 'Nam', 
    region: 'Nam', 
    description: 'Giọng ông lão Nam Bộ, từ tốn, hiền từ, ấm tình làng nghĩa xóm', 
    instruction: 'Giọng nam già miền Nam, phong thái ông lão hiền hậu, từ tốn, đầy tình cảm mộc mạc.' 
  },
  { 
    id: 'nam-fenrir', 
    baseVoice: 'Fenrir', 
    name: 'Hùng Dũng', 
    gender: 'Nam', 
    region: 'Nam', 
    description: 'Giọng nam miền Nam, mạnh mẽ, uy lực, phù hợp vai kịch tính hoặc phản diện', 
    instruction: 'Giọng nam miền Nam mạnh mẽ, dứt khoát, uy quyền, hào khí.' 
  },
  { 
    id: 'nam-mientay', 
    baseVoice: 'Fenrir', 
    name: 'Gia Bảo', 
    gender: 'Nam', 
    region: 'Nam', 
    description: 'Giọng nam miền Tây, hào sảng, thật thà, chân chất bình dị', 
    instruction: 'Giọng nam miền Tây hào sảng, chân chất, phóng khoáng, gần gũi.' 
  },
  { 
    id: 'nam-baimai', 
    baseVoice: 'Zephyr', 
    name: 'Bé Mai', 
    gender: 'Nữ', 
    region: 'Nam', 
    description: 'Giọng nữ miền Nam trẻ tuổi, tươi tắn, trong trẻo, hồn nhiên', 
    instruction: 'Giọng nữ miền Nam trẻ trung, nhẹ nhàng, trong sáng, hồn nhiên vui tươi.' 
  },

  // Miền Bắc
  { 
    id: 'bac-charon', 
    baseVoice: 'Charon', 
    name: 'Duy Mạnh', 
    gender: 'Nam', 
    region: 'Bắc', 
    description: 'Giọng nam miền Bắc, thanh lịch, trang trọng, chuẩn đài truyền hình', 
    instruction: 'Giọng nam miền Bắc chuẩn Hà Nội, phong thái trang trọng, rành mạch, đĩnh đạc.' 
  },
  { 
    id: 'bac-kore', 
    baseVoice: 'Kore', 
    name: 'Ngọc Huyền', 
    gender: 'Nữ', 
    region: 'Bắc', 
    description: 'Giọng nữ miền Bắc, Hà Nội gốc, dịu dàng, quý phái, văn học cổ điển', 
    instruction: 'Giọng nữ Hà Nội thanh lịch, dịu dàng, trang nhã, ấm áp.' 
  },
  { 
    id: 'bac-zephyr', 
    baseVoice: 'Zephyr', 
    name: 'Thùy Chi', 
    gender: 'Nữ', 
    region: 'Bắc', 
    description: 'Giọng nữ miền Bắc trẻ trung, ngọt ngào, trong sáng như sương sớm', 
    instruction: 'Giọng nữ miền Bắc trẻ trung, nhẹ nhàng, trong trẻo, cuốn hút.' 
  },
  { 
    id: 'bac-puck', 
    baseVoice: 'Puck', 
    name: 'Tuấn Khang', 
    gender: 'Nam', 
    region: 'Bắc', 
    description: 'Giọng nam miền Bắc trẻ tuổi, hoạt bát, sôi nổi, giàu năng lượng', 
    instruction: 'Giọng nam miền Bắc trẻ tuổi, hoạt bát, dứt khoát, sôi nổi.' 
  },
  
  // Miền Trung
  { 
    id: 'trung-charon', 
    baseVoice: 'Charon', 
    name: 'Hoàng Bách', 
    gender: 'Nam', 
    region: 'Trung', 
    description: 'Giọng nam miền Trung, mộc mạc, chân chất, kiên cường giàu nghị lực', 
    instruction: 'Giọng nam miền Trung mộc mạc, âm sắc đậm đà địa phương, chân thành.' 
  },
  { 
    id: 'trung-kore', 
    baseVoice: 'Kore', 
    name: 'Phương Nam', 
    gender: 'Nữ', 
    region: 'Trung', 
    description: 'Giọng nữ miền Trung, sâu lắng, đậm đà, da diết truyền cảm', 
    instruction: 'Giọng nữ miền Trung sâu lắng, đôn hậu, da diết, tình cảm.' 
  },
  { 
    id: 'trung-hue', 
    baseVoice: 'Kore', 
    name: 'Hương Giang', 
    gender: 'Nữ', 
    region: 'Trung', 
    description: 'Giọng nữ Huế, dịu dàng, uyển chuyển, thơ mộng, dạ thưa ngọt ngào', 
    instruction: 'Giọng nữ Huế ngọt ngào, âm điệu uyển chuyển, nhẹ nhàng thơ mộng.' 
  },
];

export const VALID_TAGS = [
  "warm", "whisper", "tension", "joy", "sadness", "anger", "fear", "mystery",
  "formal", "mellow", "breath", "pause", "southern", "shout", "cold", "sarcastic",
  "romantic", "energetic", "singing", "humming", "melodic", "vocal", "scream", "laugh", "giggle", "gasp",
  "hát", "cười lớn", "cười khúc khích", "quát lớn", "hào hứng", "nhẹ nhàng", "thở dài", "kêu gào"
];

/**
 * Returns distinct color styling for emotion tags
 */
export function getTagColorInfo(rawTag: string) {
  const clean = rawTag.replace(/[\[\]]/g, '').toLowerCase().trim();
  
  // 1. Tươi vui & Hào hứng (Vàng hổ phách)
  if (['joy', 'hào hứng', 'energetic', 'vocal'].includes(clean)) {
    return {
      name: 'Vui tươi',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      pillBg: 'bg-amber-500 text-white',
      border: 'border-amber-400',
      text: 'text-amber-800',
      icon: '✨',
      desc: 'Tươi vui, hân hoan, rạng rỡ'
    };
  }
  // 2. Ấm áp & Lãng mạn (Cam ấm)
  if (['warm', 'romantic', 'mellow'].includes(clean)) {
    return {
      name: 'Ấm áp',
      badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
      pillBg: 'bg-orange-500 text-white',
      border: 'border-orange-400',
      text: 'text-orange-800',
      icon: '🔥',
      desc: 'Ấm áp, tình cảm, êm dịu'
    };
  }
  // 3. Thì thầm & Nhẹ nhàng (Xanh ngọc / Teal)
  if (['whisper', 'nhẹ nhàng', 'breath', 'thở dài'].includes(clean)) {
    return {
      name: 'Thì thầm',
      badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
      pillBg: 'bg-teal-600 text-white',
      border: 'border-teal-400',
      text: 'text-teal-800',
      icon: '🌬️',
      desc: 'Nhẹ nhàng, từ tốn, thủ thỉ'
    };
  }
  // 4. Kịch tính & Tức giận (Đỏ thắm / Rose)
  if (['tension', 'quát lớn', 'anger', 'shout', 'scream'].includes(clean)) {
    return {
      name: 'Kịch tính',
      badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
      pillBg: 'bg-rose-600 text-white',
      border: 'border-rose-400',
      text: 'text-rose-800',
      icon: '⚡',
      desc: 'Kịch tính, dồn dập, gay gắt'
    };
  }
  // 5. U sầu & Buồn (Xanh lam / Sky)
  if (['sadness', 'cold'].includes(clean)) {
    return {
      name: 'U sầu',
      badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
      pillBg: 'bg-sky-600 text-white',
      border: 'border-sky-400',
      text: 'text-sky-800',
      icon: '💧',
      desc: 'Sâu lắng, nghẹn ngào, xúc động'
    };
  }
  // 6. Bí ẩn & Sợ hãi (Tím huyền bí)
  if (['mystery', 'fear'].includes(clean)) {
    return {
      name: 'Bí ẩn',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      pillBg: 'bg-purple-600 text-white',
      border: 'border-purple-400',
      text: 'text-purple-800',
      icon: '🎭',
      desc: 'Huyền bí, lôi cuốn, hồi hộp'
    };
  }
  // 7. Âm thanh & Tiếng cười (Hồng sen)
  if (['cười lớn', 'cười khúc khích', 'laugh', 'giggle', 'hát', 'singing', 'humming', 'melodic'].includes(clean)) {
    return {
      name: 'Tiếng cười / Hát',
      badgeBg: 'bg-pink-100 text-pink-900 border-pink-300',
      pillBg: 'bg-pink-600 text-white',
      border: 'border-pink-400',
      text: 'text-pink-800',
      icon: '😆',
      desc: 'Tiếng cười sảng khoái hoặc ngân nga'
    };
  }

  // Mặc định
  return {
    name: 'Cảm xúc',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    pillBg: 'bg-slate-600 text-white',
    border: 'border-slate-400',
    text: 'text-slate-700',
    icon: '🏷️',
    desc: 'Chỉ dẫn cảm xúc chung'
  };
}

export const TAG_BUTTONS = [
  { tag: "[joy]", label: "Vui vẻ", category: "Tươi sáng" },
  { tag: "[hào hứng]", label: "Hào hứng", category: "Tươi sáng" },
  { tag: "[warm]", label: "Ấm áp", category: "Ấm áp" },
  { tag: "[romantic]", label: "Lãng mạn", category: "Ấm áp" },
  { tag: "[nhẹ nhàng]", label: "Nhẹ nhàng", category: "Thì thầm" },
  { tag: "[whisper]", label: "Thì thầm", category: "Thì thầm" },
  { tag: "[thở dài]", label: "Thở dài", category: "Thì thầm" },
  { tag: "[cười lớn]", label: "Cười lớn", category: "Tiếng cười" },
  { tag: "[cười khúc khích]", label: "Khúc khích", category: "Tiếng cười" },
  { tag: "[hát]", label: "Ngân nga", category: "Tiếng cười" },
  { tag: "[tension]", label: "Kịch tính", category: "Kịch tính" },
  { tag: "[quát lớn]", label: "Quát lớn", category: "Kịch tính" },
  { tag: "[anger]", label: "Tức giận", category: "Kịch tính" },
  { tag: "[mystery]", label: "Bí ẩn", category: "Bí ẩn" },
  { tag: "[fear]", label: "Sợ hãi", category: "Bí ẩn" },
  { tag: "[sadness]", label: "U sầu", category: "U sầu" },
];

const DEFAULT_TRANSCRIPT = `[joy] Xin chào các bạn! Mình là Trần Thanh Phúc. [warm] Chào mừng bạn đến với phòng thu kể chuyện chuyên nghiệp bằng giọng đọc AI. [hào hứng] Bạn có thể tùy chọn giọng nghệ sĩ của cả ba miền Bắc, Trung, Nam với đầy đủ cảm xúc diễn xuất. [mystery] Nào, hãy nhập kịch bản của bạn và cùng trải nghiệm ngay nhé!`;

/**
 * Extracts raw 16-bit PCM audio samples from either raw PCM or a WAV file.
 */
function extractPcmSamples(data: Uint8Array): Int16Array {
  if (
    data.length >= 44 &&
    data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
    data[8] === 0x57 && data[9] === 0x41 && data[10] === 0x56 && data[11] === 0x45
  ) {
    let offset = 12;
    while (offset + 8 <= data.length) {
      const chunkId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
      const chunkSize = (data[offset + 4]) | (data[offset + 5] << 8) | (data[offset + 6] << 16) | (data[offset + 7] << 24);
      offset += 8;
      if (chunkId === 'data') {
        const pcmBytes = data.subarray(offset, Math.min(offset + chunkSize, data.length));
        const numSamples = Math.floor(pcmBytes.length / 2);
        const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, numSamples * 2);
        const samples = new Int16Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
          samples[i] = view.getInt16(i * 2, true);
        }
        return samples;
      }
      offset += chunkSize;
    }

    const pcmBytes = data.subarray(44);
    const numSamples = Math.floor(pcmBytes.length / 2);
    const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, numSamples * 2);
    const samples = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      samples[i] = view.getInt16(i * 2, true);
    }
    return samples;
  }

  const numSamples = Math.floor(data.length / 2);
  const view = new DataView(data.buffer, data.byteOffset, numSamples * 2);
  const samples = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    samples[i] = view.getInt16(i * 2, true);
  }
  return samples;
}

/**
 * Builds a clean 44-byte RIFF/WAVE header for PCM samples (Mono or Stereo).
 */
function createWavBlob(samples: Int16Array, sampleRate: number = 24000, isStereo: boolean = false): Blob {
  const numChannels = isStereo ? 2 : 1;
  const bitsPerSample = 16;
  const numSamples = samples.length;
  const totalSamples = isStereo ? numSamples * 2 : numSamples;
  const dataSize = totalSamples * (bitsPerSample / 8);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
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

  if (isStereo) {
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(offset, samples[i], true);
      view.setInt16(offset + 2, samples[i], true);
      offset += 4;
    }
  } else {
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(offset, samples[i], true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Encodes PCM samples to MP3 using lamejs.
 */
function createMp3Blob(samples: Int16Array, sampleRate: number = 24000, bitrate: number = 192, isStereo: boolean = false): Blob {
  const numChannels = isStereo ? 2 : 1;
  const mp3encoder = new (lamejs as any).Mp3Encoder(numChannels, sampleRate, bitrate);
  const mp3Data: any[] = [];
  const sampleBlockSize = 1152;

  if (isStereo) {
    const left = samples;
    const right = samples;

    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const leftChunk = left.subarray(i, i + sampleBlockSize);
      const rightChunk = right.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
  } else {
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const chunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
  }

  const flushBuf = mp3encoder.flush();
  if (flushBuf.length > 0) mp3Data.push(flushBuf);

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

export default function App() {
  const [transcript, setTranscript] = useState(DEFAULT_TRANSCRIPT);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(VOICES[1].id); // Minh Nguyệt
  const [regionFilter, setRegionFilter] = useState<'All' | 'Nam' | 'Bắc' | 'Trung'>('All');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string>("");
  const [customPersonaInput, setCustomPersonaInput] = useState<string>("");
  const [showCustomPersonaBox, setShowCustomPersonaBox] = useState<boolean>(false);
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
  const [showColorLegend, setShowColorLegend] = useState(false);
  const [showTagReportModal, setShowTagReportModal] = useState(false);
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');
  const [downloadFormat, setDownloadFormat] = useState<'mp3' | 'wav'>('mp3');
  const [downloadBitrate, setDownloadBitrate] = useState<number>(192);
  const [isStereoExport, setIsStereoExport] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [command, setCommand] = useState("");
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [tagValidationReport, setTagValidationReport] = useState<{
    unknown: { tag: string; suggestion?: string; index?: number }[];
    malformed: string[];
    duplicate: string[];
  } | null>(null);

  // Selected voice object
  const selectedVoice = useMemo(() => {
    return VOICES.find(v => v.id === selectedVoiceId) || VOICES[0];
  }, [selectedVoiceId]);

  // Filtered voices by region and search term
  const filteredVoices = useMemo(() => {
    let list = VOICES;
    if (regionFilter !== 'All') {
      list = list.filter(v => v.region === regionFilter);
    }
    if (voiceSearchQuery.trim()) {
      const q = voiceSearchQuery.toLowerCase().trim();
      list = list.filter(v => 
        v.name.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q) ||
        v.gender.toLowerCase().includes(q)
      );
    }
    return list;
  }, [regionFilter, voiceSearchQuery]);

  // Detected tags in current transcript
  const activeTagsInScript = useMemo(() => {
    const matches = Array.from(transcript.matchAll(/\[(.*?)\]/g)) as RegExpExecArray[];
    return matches.map((m, index) => {
      const startIndex = typeof m.index === 'number' ? m.index : 0;
      return {
        raw: m[0],
        tag: (m[1] || "").toLowerCase().trim(),
        index: index,
        start: startIndex,
        end: startIndex + m[0].length
      };
    });
  }, [transcript]);

  // Sync audio playback rate with speed slider
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Select voice handler with feedback
  const handleSelectVoice = (voice: VoiceOption) => {
    setSelectedVoiceId(voice.id);
    setCommandFeedback(`Đã chọn: ${voice.name} (${voice.gender} • Miền ${voice.region})`);
    setTimeout(() => setCommandFeedback(null), 3000);
  };

  // Apply custom persona
  const handleApplyCustomPersona = () => {
    const trimmed = customPersonaInput.trim();
    if (!trimmed) {
      setVocalInstruction("");
      setCommandFeedback("Đã xóa tùy biến phong cách giọng riêng.");
    } else {
      setVocalInstruction(trimmed);
      setCommandFeedback(`Đã thiết lập giọng theo ý muốn: "${trimmed.substring(0, 30)}..."`);
    }
    setTimeout(() => setCommandFeedback(null), 3500);
  };

  // Handle file uploads (txt, pdf, docx)
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
        throw new Error("Định dạng tệp không được hỗ trợ. Vui lòng chọn .txt, .pdf hoặc .docx");
      }

      const cleanText = text.trim();
      if (cleanText) {
        setTranscript(cleanText);
        setCommandFeedback(`Đã tải kịch bản thành công từ "${file.name}"`);
      } else {
        throw new Error("Tệp không chứa nội dung văn bản có thể trích xuất.");
      }
    } catch (err) {
      console.error("File Upload Error:", err);
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi đọc tệp.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setCommandFeedback(null), 4000);
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim().toLowerCase();
    
    if (cmd.startsWith("/voice ")) {
      const voiceNamePart = cmd.replace("/voice ", "").trim();
      const foundVoice = VOICES.find(
        v => v.name.toLowerCase().includes(voiceNamePart) || v.id.toLowerCase() === voiceNamePart
      );
      if (foundVoice) {
        setSelectedVoiceId(foundVoice.id);
        setCommandFeedback(`Đã chuyển sang giọng: ${foundVoice.name} (${foundVoice.region})`);
      } else {
        setCommandFeedback(`Không tìm thấy giọng: "${voiceNamePart}"`);
      }
    } else if (cmd.startsWith("/set ")) {
      const instruction = command.slice(5).trim();
      setVocalInstruction(instruction);
      setCustomPersonaInput(instruction);
      setCommandFeedback(`Đã thiết lập đặc trưng giọng đọc.`);
    } else if (cmd.startsWith("/speed ")) {
      const sp = parseFloat(cmd.replace("/speed ", "").trim());
      if (!isNaN(sp) && sp >= 0.5 && sp <= 2.0) {
        setSpeed(sp);
        setCommandFeedback(`Đã chỉnh tốc độ: ${sp}x`);
      } else {
        setCommandFeedback("Tốc độ hợp lệ từ 0.5 đến 2.0");
      }
    } else if (cmd.startsWith("/pitch ")) {
      const pt = parseInt(cmd.replace("/pitch ", "").trim());
      if (!isNaN(pt) && pt >= -20 && pt <= 20) {
        setPitch(pt);
        setCommandFeedback(`Đã chỉnh tông giọng: ${pt}pt`);
      } else {
        setCommandFeedback("Tông giọng hợp lệ từ -20 đến 20");
      }
    } else if (cmd === "/clear") {
      setTranscript("");
      setCommandFeedback("Đã xóa toàn bộ văn bản kịch bản.");
    } else {
      setCommandFeedback("Lệnh không hợp lệ. Hỗ trợ: /voice [tên], /set [đặc trưng], /speed [0.5-2.0], /pitch [-20-20], /clear");
    }
    
    setCommand("");
    setTimeout(() => setCommandFeedback(null), 3500);
  };

  const insertTag = (tag: string) => {
    if (!textareaRef.current) {
      setTranscript(prev => `${prev} ${tag} `);
      return;
    }
    
    const start = textareaRef.current.selectionStart ?? transcript.length;
    const end = textareaRef.current.selectionEnd ?? transcript.length;
    const text = transcript;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = `${before}${tag} ${after}`;
    setTranscript(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + tag.length + 1;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const removeTagByIndex = (targetStart: number, targetEnd: number) => {
    const before = transcript.substring(0, targetStart);
    const after = transcript.substring(targetEnd);
    setTranscript((before + after).replace(/\s\s+/g, ' '));
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (audio.paused) {
      audio.play().catch((err) => {
        console.error("Audio playback error:", err);
        setError("Không thể phát âm thanh. Vui lòng bấm vào màn hình trước.");
      });
    } else {
      audio.pause();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Levenshtein distance for spelling correction
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
    const matches = Array.from(transcript.matchAll(tagRegex)) as RegExpExecArray[];
    const report: {
      unknown: { tag: string; suggestion?: string; index?: number }[];
      malformed: string[];
      duplicate: string[];
    } = { unknown: [], malformed: [], duplicate: [] };

    const seenTags = new Set<string>();

    matches.forEach(match => {
      const fullTag = match[0];
      const tagName = (match[1] || "").toLowerCase().trim();
      
      if (!VALID_TAGS.includes(tagName)) {
        let bestMatch = "";
        let minDistance = 3;
        
        VALID_TAGS.forEach(validTag => {
          const distance = getLevenshteinDistance(tagName, validTag);
          if (distance < minDistance) {
            minDistance = distance;
            bestMatch = validTag;
          }
        });
        
        report.unknown.push({ 
          tag: fullTag, 
          suggestion: bestMatch ? `[${bestMatch}]` : undefined,
          index: typeof match.index === 'number' ? match.index : undefined
        });
      } else {
        if (seenTags.has(tagName)) {
          report.duplicate.push(fullTag);
        }
        seenTags.add(tagName);
      }
    });

    const openIndices: number[] = [];
    const closedIndices: number[] = [];
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i] === '[') openIndices.push(i);
      if (transcript[i] === ']') closedIndices.push(i);
    }
    
    if (openIndices.length !== closedIndices.length) {
      report.malformed.push(`Mất cân bằng cặp ngoặc: ${openIndices.length} dấu mở [, ${closedIndices.length} dấu đóng ].`);
    }

    setTagValidationReport(report);
    setShowTagReportModal(true);

    if (report.unknown.length === 0 && report.malformed.length === 0 && report.duplicate.length === 0) {
      setCommandFeedback("Tất cả thẻ cảm xúc trong kịch bản đều hoàn toàn hợp lệ!");
    }
  };

  const fixSingleTag = (oldTag: string, newTag: string) => {
    setTranscript(prev => prev.replace(oldTag, newTag));
    setTagValidationReport(prev => {
      if (!prev) return null;
      return {
        ...prev,
        unknown: prev.unknown.filter(u => u.tag !== oldTag)
      };
    });
    setCommandFeedback(`Đã sửa thẻ ${oldTag} thành ${newTag}`);
  };

  const autoFixAllTags = () => {
    if (!tagValidationReport) return;
    let updated = transcript;
    tagValidationReport.unknown.forEach(item => {
      if (item.suggestion) {
        updated = updated.split(item.tag).join(item.suggestion);
      }
    });
    setTranscript(updated);
    setTagValidationReport(null);
    setShowTagReportModal(false);
    setCommandFeedback("Đã tự động sửa toàn bộ thẻ cảm xúc!");
  };

  // Web Speech Fallback / Instant Preview (Không tốn hạn mức AI)
  const [isWebSpeechPlaying, setIsWebSpeechPlaying] = useState(false);

  const handleWebSpeechPreview = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError("Trình duyệt không hỗ trợ Web Speech API.");
      return;
    }
    if (isWebSpeechPlaying) {
      window.speechSynthesis.cancel();
      setIsWebSpeechPlaying(false);
      setCommandFeedback("Đã dừng đọc thử.");
      setTimeout(() => setCommandFeedback(null), 2500);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean all tags and format
    const cleanText = transcript
      .replace(/\[(.*?)\]/g, ' ')
      .replace(/<(.*?)>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      setError("Kịch bản không có nội dung chữ để đọc.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speed;
    utterance.pitch = Math.max(0.5, Math.min(2, 1 + pitch * 0.05));

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => 
      v.lang.startsWith('vi') || 
      v.lang.includes('VIE') || 
      v.name.toLowerCase().includes('vietnam')
    );
    if (viVoice) {
      utterance.voice = viVoice;
    }

    utterance.onstart = () => setIsWebSpeechPlaying(true);
    utterance.onend = () => setIsWebSpeechPlaying(false);
    utterance.onerror = () => setIsWebSpeechPlaying(false);

    window.speechSynthesis.speak(utterance);
    setCommandFeedback("Đang đọc thử bằng giọng trình duyệt (Web Speech)...");
    setTimeout(() => setCommandFeedback(null), 3000);
  };

  // Audio Generation via server-side endpoint
  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError("Vui lòng nhập kịch bản hoặc tải tài liệu lên trước khi chuyển đổi.");
      return;
    }

    setIsGenerating(true);
    setIsPlaying(false);
    if (isWebSpeechPlaying) {
      window.speechSynthesis.cancel();
      setIsWebSpeechPlaying(false);
    }
    setError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          voiceName: selectedVoice.baseVoice,
          region: selectedVoice.region,
          voiceInstruction: selectedVoice.instruction,
          vocalInstruction,
          speed,
          pitch,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi tạo giọng nói từ hệ thống.');
      }

      if (!data.audioBase64) {
        throw new Error('Không nhận được dữ liệu âm thanh hợp lệ từ máy chủ.');
      }

      // Convert base64 to Uint8Array
      const binaryString = atob(data.audioBase64);
      const audioBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        audioBytes[i] = binaryString.charCodeAt(i);
      }

      setRawAudioData(audioBytes);

      // Extract PCM samples and build clean WAV blob
      const pcmSamples = extractPcmSamples(audioBytes);
      const playableBlob = createWavBlob(pcmSamples, 24000, false);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const newUrl = URL.createObjectURL(playableBlob);
      setAudioUrl(newUrl);
      setIsPlaying(false);
      setCurrentTime(0);

    } catch (err) {
      console.error("Generation Error:", err);
      setError(err instanceof Error ? err.message : "Không thể tạo giọng nói.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getTTPFilename = (ext: string) => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `ttp-${dd}-${mm}-${yyyy}_${hh}${min}.${ext}`;
  };

  const handleDownload = async () => {
    if (!rawAudioData) return;
    
    try {
      const pcmSamples = extractPcmSamples(rawAudioData);
      let finalAudioBlob: Blob;
      const extension = downloadFormat;
      const filename = getTTPFilename(extension);
      
      if (downloadFormat === 'mp3') {
        finalAudioBlob = createMp3Blob(pcmSamples, 24000, downloadBitrate, isStereoExport);
      } else {
        finalAudioBlob = createWavBlob(pcmSamples, 24000, isStereoExport);
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
      setError("Không thể mã hóa và tải xuống bản thu. Vui lòng thử lại.");
    }
  };

  const wordCount = useMemo(() => {
    const clean = transcript.replace(/\[.*?\]/g, ' ').trim();
    if (!clean) return 0;
    return clean.split(/\s+/).length;
  }, [transcript]);

  const COMMAND_PRESETS = [
    { label: "Nam miền Nam ấm áp", cmd: "/set giọng nam miền Nam ấm áp, truyền cảm" },
    { label: "Nữ miền Nam nhẹ nhàng", cmd: "/set giọng nữ miền Nam nhẹ nhàng, trong trẻo" },
    { label: "Nam miền Bắc trang trọng", cmd: "/set giọng nam miền Bắc rành mạch, trang trọng" },
    { label: "Nữ miền Bắc thanh lịch", cmd: "/set giọng nữ miền Bắc thanh lịch, chuẩn xác" },
    { label: "Nam miền Trung mộc mạc", cmd: "/set giọng nam miền Trung chân chất, mộc mạc" },
    { label: "Nữ Huế dịu dàng thơ mộng", cmd: "/set giọng nữ Huế ngọt ngào, dạ thưa tha thiết" },
    { label: "Ông lão miền Tây từ tốn", cmd: "/set giọng ông lão miền Tây từ tốn, hiền hậu" },
  ];

  const CUSTOM_PERSONA_SUGGESTIONS = [
    "Giọng mẹ hiền kể chuyện cổ tích cho con ngủ",
    "Giọng phát thanh viên thời sự VTV trang trọng",
    "Giọng kể chuyện đêm khuya ma mị, rùng rợn",
    "Giọng MC du lịch vui tươi, hoạt bát",
    "Giọng đọc sách phát triển bản thân trầm ấm"
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden flex flex-col selection:bg-blue-500/20">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-white" />
        <div className="absolute -top-[15%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/60 blur-[100px]" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[50%] h-[50%] rounded-full bg-pink-100/50 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.25] bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:20px_20px]" />
      </div>

      {/* Header */}
      <header className="h-20 px-6 lg:px-10 border-b border-slate-200/80 flex items-center justify-between z-20 relative bg-white/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md flex items-center justify-center text-white relative">
            <Mic2 className="w-6 h-6" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[2px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-extrabold border border-blue-200/60">Studio 4.0</span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">|</span>
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Gemini 3.8 Flash TTS</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Chuyển Văn Bản Thành Giọng Kể Chuyện</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Chỉ đọc lời thoại kịch bản</span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6 p-4 lg:p-8 z-10 max-w-[1720px] mx-auto w-full">
        {/* LEFT COLUMN: Narrative Viewport / Script Editor */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 md:p-7 flex flex-col shadow-sm relative overflow-hidden">
          {/* Generating Overlay */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
              >
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 flex flex-col items-center gap-5 max-w-sm w-full">
                  <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-pink-500 to-blue-500 rounded-full animate-pulse" />
                  <GeneratingWaves />
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-slate-900">Đang diễn hoạt giọng đọc AI...</h3>
                    <p className="text-slate-500 text-xs">Mô hình đang tổng hợp lời thoại và cảm xúc kịch bản theo đúng thiết lập.</p>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-full">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Vui lòng đợi vài giây</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Editor Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Ô Kịch Bản
              </span>

              {/* View Switcher: Write vs Storyboard */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setEditorMode('write')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                    editorMode === 'write' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Soạn thảo</span>
                </button>
                <button
                  onClick={() => setEditorMode('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                    editorMode === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem kịch bản có màu</span>
                </button>
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.pdf,.docx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all text-xs font-bold"
                title="Tải tệp .txt, .pdf, .docx vào kịch bản"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                <span>Tải tệp</span>
              </button>

              <button
                onClick={() => setTranscript("")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all text-xs font-semibold"
                title="Xóa sạch văn bản"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">
                {wordCount} từ <span className="text-slate-300">|</span> {transcript.length} ký tự
              </span>
            </div>
          </div>

          {/* COLOR-CODED QUICK EMOTION TAG PALETTE */}
          <div className="mb-4 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Thẻ cảm xúc được tô màu phân biệt theo nhóm:
              </span>
              <button
                onClick={() => setShowColorLegend(!showColorLegend)}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <Info className="w-3 h-3" />
                <span>{showColorLegend ? "Ẩn chú giải" : "Xem ý nghĩa màu"}</span>
              </button>
            </div>

            {/* Optional Color Legend */}
            <AnimatePresence>
              {showColorLegend && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pb-2 text-[10px] border-b border-slate-200"
                >
                  <div className="flex items-center gap-1.5 p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Vàng: Vui tươi, hào hứng</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-orange-50 rounded-lg border border-orange-200 text-orange-900 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span>Cam: Ấm áp, lãng mạn</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-teal-50 rounded-lg border border-teal-200 text-teal-900 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span>Xanh ngọc: Thì thầm, nhẹ nhàng</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-900 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Đỏ hồng: Kịch tính, quát lớn</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-pink-50 rounded-lg border border-pink-200 text-pink-900 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                    <span>Hồng sen: Cười lớn, ngân nga</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-purple-50 rounded-lg border border-purple-200 text-purple-900 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>Tím: Bí ẩn, sợ hãi</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-sky-50 rounded-lg border border-sky-200 text-sky-900 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span>Xanh lam: U sầu, buồn</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Insert Buttons with Distinct Color Badges */}
            <div className="flex flex-wrap gap-1.5">
              {TAG_BUTTONS.map((item) => {
                const color = getTagColorInfo(item.tag);
                return (
                  <button
                    key={item.tag}
                    onClick={() => insertTag(item.tag)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold shadow-xs transition-all active:scale-95 hover:shadow-sm ${color.badgeBg}`}
                    title={`Chèn thẻ ${item.tag} (${color.desc})`}
                  >
                    <span>{color.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Script Textarea / Preview Container */}
          <div className="relative flex-1 min-h-[340px] flex flex-col">
            {editorMode === 'write' ? (
              <textarea
                ref={textareaRef}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                spellCheck="false"
                autoComplete="off"
                placeholder="Nhập kịch bản hoặc lời thoại của bạn tại đây... Hãy chèn các thẻ cảm xúc như [joy], [warm], [whisper] để tạo sắc thái sống động!"
                className="w-full flex-1 p-4 bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl text-slate-900 font-sans text-base leading-relaxed focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400 resize-none shadow-inner"
              />
            ) : (
              /* Storyboard / Preview Mode: Shows tags as beautiful distinct color-coded badges */
              <div className="w-full flex-1 p-5 bg-slate-50/60 border border-slate-200 rounded-2xl overflow-y-auto text-slate-800 text-base leading-loose font-sans">
                {transcript.split(/(\[.*?\])/).map((part, i) => {
                  if (part.startsWith('[') && part.endsWith(']')) {
                    const color = getTagColorInfo(part);
                    return (
                      <span 
                        key={i}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 mx-1 rounded-md text-xs font-bold border shadow-xs ${color.badgeBg}`}
                      >
                        <span>{color.icon}</span>
                        <span>{part}</span>
                      </span>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </div>
            )}
          </div>

          {/* Active Detected Tags Strip with Vibrant Colors */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Layout className="w-3.5 h-3.5 text-blue-500" />
                Thẻ trong bài ({activeTagsInScript.length}):
              </span>
              {activeTagsInScript.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Chưa có thẻ nào trong kịch bản.</span>
              ) : (
                activeTagsInScript.map((t, idx) => {
                  const color = getTagColorInfo(t.raw);
                  return (
                    <span 
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-xs font-bold rounded-md shadow-xs ${color.badgeBg}`}
                    >
                      <span>{color.icon}</span>
                      <span>{t.raw}</span>
                      <button 
                        onClick={() => removeTagByIndex(t.start, t.end)}
                        className="opacity-60 hover:opacity-100 hover:text-red-700 transition-opacity ml-0.5"
                        title="Xóa thẻ này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            <button
              onClick={validateTags}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all"
              title="Kiểm tra tính hợp lệ của tất cả thẻ trong bài"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Kiểm tra lỗi thẻ</span>
            </button>
          </div>

          {/* Vocal Instruction Bar */}
          <AnimatePresence>
            {vocalInstruction && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-3 p-3 bg-blue-50/90 rounded-xl border border-blue-200 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden text-xs">
                  <Mic2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="font-bold text-blue-900 truncate">
                    Đặc trưng giọng riêng: {vocalInstruction}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setVocalInstruction("");
                    setCustomPersonaInput("");
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 transition-all rounded-md"
                  title="Xóa đặc trưng này"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Command Form */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
            <form onSubmit={handleCommand} className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 font-bold text-xs select-none">
                /
              </div>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Gõ lệnh nhanh như /voice Minh Nguyệt, /set giọng trầm ấm..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
              />
            </form>

            <div className="relative">
              <button
                onClick={() => {
                  setShowPresets(!showPresets);
                  setShowHelp(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Mẫu giọng</span>
              </button>

              <AnimatePresence>
                {showPresets && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-slate-200 rounded-2xl p-2 shadow-xl z-50 overflow-hidden"
                  >
                    <div className="text-[11px] font-bold text-slate-500 px-3 py-2 border-b border-slate-100">
                      Chọn phong cách mẫu
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1 space-y-1">
                      {COMMAND_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCommand(p.cmd);
                            setShowPresets(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between"
                        >
                          <span>{p.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Controls & Audio Player */}
        <aside className="flex flex-col gap-5">
          {/* Voice Selector Card - FULLY REFACTORED TO GUARANTEE ACCURATE SELECTION */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Mic2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Chọn Giọng Nghệ Sĩ</h3>
                  <p className="text-[11px] text-slate-500">Chuẩn âm sắc 3 miền Bắc, Trung, Nam</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomPersonaBox(!showCustomPersonaBox)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                  showCustomPersonaBox || vocalInstruction 
                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
                title="Tùy chỉnh phong cách giọng đọc theo ý muốn của bạn"
              >
                + Tùy biến giọng
              </button>
            </div>

            {/* Region Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold text-center">
              {(['All', 'Nam', 'Bắc', 'Trung'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(r)}
                  className={`py-1.5 rounded-lg transition-all ${
                    regionFilter === r 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'All' ? 'Tất cả (13)' : `Miền ${r}`}
                </button>
              ))}
            </div>

            {/* Search Box for Voices */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={voiceSearchQuery}
                onChange={(e) => setVoiceSearchQuery(e.target.value)}
                placeholder="Tìm nghệ sĩ theo tên, miền hoặc phong thái..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              {voiceSearchQuery && (
                <button
                  onClick={() => setVoiceSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Currently Active Voice Highlight */}
            <div className="p-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200/80 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {selectedVoice.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900">{selectedVoice.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      selectedVoice.gender === 'Nam' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                    }`}>
                      {selectedVoice.gender} • Miền {selectedVoice.region}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{selectedVoice.description}</p>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Expandable Custom Voice Persona Box ("theo ý muốn") */}
            <AnimatePresence>
              {(showCustomPersonaBox || vocalInstruction) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Tùy biến phong cách giọng đọc theo ý muốn:
                    </span>
                    {vocalInstruction && (
                      <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                        Đang áp dụng
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customPersonaInput}
                      onChange={(e) => setCustomPersonaInput(e.target.value)}
                      placeholder="VD: Giọng mẹ hiền kể chuyện cổ tích, giọng phát thanh viên thời sự..."
                      className="flex-1 bg-white border border-purple-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={handleApplyCustomPersona}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                    >
                      Lưu
                    </button>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {CUSTOM_PERSONA_SUGGESTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCustomPersonaInput(s);
                          setVocalInstruction(s);
                          setCommandFeedback(`Đã áp dụng: "${s}"`);
                          setTimeout(() => setCommandFeedback(null), 3000);
                        }}
                        className="text-[10px] px-2 py-0.5 bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 rounded-md transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voices List with Scroll */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {filteredVoices.map((voice) => {
                const isSelected = selectedVoiceId === voice.id;
                return (
                  <button
                    key={voice.id}
                    onClick={() => handleSelectVoice(voice)}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-2 ring-blue-100'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected 
                        ? 'bg-blue-600 text-white' 
                        : voice.gender === 'Nam' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                      {voice.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900 font-extrabold' : 'text-slate-800'}`}>
                          {voice.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            voice.gender === 'Nam' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                          }`}>
                            {voice.gender}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {voice.region}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                        {voice.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice Tuning Sliders (Speed & Pitch) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                Tinh Chỉnh Tốc Độ & Tông Giọng
              </span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {speed}x / {pitch > 0 ? `+${pitch}` : pitch}pt
              </span>
            </div>

            <div className="space-y-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              {/* Speed Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Tốc độ nói</span>
                  <span className={speed !== 1.0 ? "text-blue-600 font-bold" : "text-slate-500"}>
                    {speed}x {speed === 1.0 ? "(Chuẩn)" : speed > 1.0 ? "(Nhanh)" : "(Chậm)"}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  value={speed} 
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
                  <button onClick={() => setSpeed(0.8)} className="hover:text-blue-600">0.8x</button>
                  <button onClick={() => setSpeed(1.0)} className="hover:text-blue-600">1.0x (Chuẩn)</button>
                  <button onClick={() => setSpeed(1.2)} className="hover:text-blue-600">1.2x</button>
                </div>
              </div>

              {/* Pitch Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Tông giọng (Cao / Trầm)</span>
                  <span className={pitch !== 0 ? "text-blue-600 font-bold" : "text-slate-500"}>
                    {pitch > 0 ? `+${pitch} (Thanh)` : pitch < 0 ? `${pitch} (Trầm)` : "0 (Tự nhiên)"}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-20" 
                  max="20" 
                  step="1" 
                  value={pitch} 
                  onChange={(e) => setPitch(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
                  <button onClick={() => setPitch(-10)} className="hover:text-blue-600">-10 (Trầm)</button>
                  <button onClick={() => setPitch(0)} className="hover:text-blue-600">0 (Chuẩn)</button>
                  <button onClick={() => setPitch(10)} className="hover:text-blue-600">+10 (Thanh)</button>
                </div>
              </div>
            </div>
          </div>

          {/* Player & Action Card */}
          <div className={`rounded-3xl border transition-all duration-300 shadow-sm relative overflow-hidden ${
            audioUrl 
              ? "bg-gradient-to-b from-blue-600 to-indigo-700 text-white border-blue-600 shadow-lg" 
              : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="p-5 md:p-6 flex flex-col items-center gap-4 relative z-10">
              {/* Status Header */}
              <div className="w-full flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${audioUrl ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
                  <span>
                    {isGenerating 
                      ? "Đang xử lý âm thanh..." 
                      : audioUrl 
                        ? "Bản thu đã sẵn sàng" 
                        : "Sẵn sàng chuyển giọng"}
                  </span>
                </div>
                {audioUrl && (
                  <span className="font-mono bg-black/20 px-2 py-0.5 rounded text-[11px]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                )}
              </div>

              {/* Main CTA Button */}
              <div className="w-full flex gap-3">
                <button
                  disabled={isGenerating || !transcript.trim()}
                  onClick={handleGenerate}
                  className={`flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 ${
                    audioUrl 
                      ? "bg-white text-blue-700 hover:bg-slate-50" 
                      : "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                  <span>{audioUrl ? "TÁI TẠO BẢN THU MỚI" : "BẮT ĐẦU CHUYỂN GIỌNG AI"}</span>
                </button>

                {audioUrl && (
                  <button 
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-2xl bg-white text-blue-600 flex items-center justify-center hover:scale-105 active:scale-95 shadow-md border border-white/30 shrink-0"
                    title={isPlaying ? "Tạm dừng" : "Phát"}
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                  </button>
                )}
              </div>

              {/* Instant Web Speech Preview Button (Zero Quota) */}
              <button
                type="button"
                onClick={handleWebSpeechPreview}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isWebSpeechPlaying
                    ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title="Đọc trực tiếp bằng giọng đọc trình duyệt máy tính/điện thoại, không tốn hạn mức AI"
              >
                <Volume2 className="w-4 h-4" />
                <span>
                  {isWebSpeechPlaying 
                    ? "DỪNG ĐỌC THỬ (TRÌNH DUYỆT)" 
                    : "ĐỌC THỬ KỊCH BẢN (WEB SPEECH - KHÔNG TỐN LƯỢT AI)"}
                </span>
              </button>

              {/* Audio Controls and Download Options */}
              <AnimatePresence>
                {audioUrl && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="w-full space-y-3.5 pt-2 border-t border-white/20"
                  >
                    {/* Scrub bar */}
                    <div className="space-y-1">
                      <input 
                        type="range"
                        min="0"
                        max={duration > 0 ? duration : 0}
                        step="0.05"
                        value={currentTime}
                        onChange={(e) => {
                          const time = parseFloat(e.target.value);
                          if (audioRef.current) {
                            audioRef.current.currentTime = time;
                          }
                          setCurrentTime(time);
                        }}
                        className="w-full h-2 bg-black/25 rounded-full appearance-none cursor-pointer accent-white"
                      />
                    </div>

                    {/* Format options */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <select 
                        value={downloadFormat}
                        onChange={(e) => setDownloadFormat(e.target.value as any)}
                        className="w-full bg-black/20 border border-white/20 rounded-xl px-3 py-2 text-white font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="mp3" className="text-slate-900">Định dạng: MP3</option>
                        <option value="wav" className="text-slate-900">Định dạng: WAV (Lossless)</option>
                      </select>
                      
                      <div className="flex gap-1.5">
                        <select 
                          value={downloadBitrate}
                          disabled={downloadFormat !== 'mp3'}
                          onChange={(e) => setDownloadBitrate(parseInt(e.target.value))}
                          className="flex-1 bg-black/20 border border-white/20 rounded-xl px-2 py-2 text-white font-bold focus:outline-none cursor-pointer disabled:opacity-40 text-center"
                        >
                          <option value="128" className="text-slate-900">128 kbps</option>
                          <option value="192" className="text-slate-900">192 kbps</option>
                          <option value="320" className="text-slate-900">320 kbps</option>
                        </select>
                        <button 
                          onClick={() => setIsStereoExport(!isStereoExport)}
                          className={`px-3 rounded-xl border border-white/20 font-bold uppercase transition-all ${
                            isStereoExport ? 'bg-white text-blue-700' : 'bg-black/20 text-white'
                          }`}
                          title={isStereoExport ? "Đang xuất Stereo 2 kênh" : "Đang xuất Mono 1 kênh"}
                        >
                          {isStereoExport ? "Stereo" : "Mono"}
                        </button>
                      </div>
                    </div>

                    {/* Download Button */}
                    <button 
                      onClick={handleDownload}
                      className="w-full py-3.5 rounded-xl bg-white text-blue-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
                    >
                      <Download className="w-4 h-4" />
                      <span>TẢI XUỐNG BẢN THU (.{(downloadFormat).toUpperCase()})</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Native Audio Element */}
              <audio 
                ref={audioRef}
                src={audioUrl || undefined}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                className="hidden"
              />
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="h-14 px-6 lg:px-10 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 z-10 bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-6 font-medium">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Chuẩn âm thanh: 24kHz Mono/Stereo</span>
          <span className="hidden sm:flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-500" /> Hỗ trợ 13 giọng đọc 3 miền & tùy biến</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700">
            Ứng dụng phát triển bởi <a href="https://tranthanhphucbvdkgr.bio.link" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Trần Thanh Phúc</a>
          </span>
        </div>
      </footer>

      {/* Tag Validation Report Modal */}
      <AnimatePresence>
        {showTagReportModal && tagValidationReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Báo cáo kiểm tra thẻ cảm xúc</h3>
                    <p className="text-[11px] text-slate-500">Phát hiện thẻ sai chính tả hoặc lỗi ngoặc</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTagReportModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {tagValidationReport.unknown.length === 0 && 
               tagValidationReport.malformed.length === 0 && 
               tagValidationReport.duplicate.length === 0 ? (
                <div className="py-6 flex flex-col items-center gap-2.5 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-emerald-800">Tất cả thẻ đều hợp lệ!</h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Mọi thẻ cảm xúc trong kịch bản đều chuẩn xác và được mô hình AI nhận diện tối ưu.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {tagValidationReport.unknown.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Thẻ chưa nhận diện ({tagValidationReport.unknown.length})
                      </div>
                      {tagValidationReport.unknown.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                          <span className="font-mono font-bold text-amber-900">{item.tag}</span>
                          {item.suggestion ? (
                            <button 
                              onClick={() => fixSingleTag(item.tag, item.suggestion!)}
                              className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg transition-colors text-[11px]"
                            >
                              Sửa thành {item.suggestion}
                            </button>
                          ) : (
                            <span className="text-[11px] text-amber-600 italic">Không có gợi ý</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {tagValidationReport.malformed.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Lỗi ngoặc ({tagValidationReport.malformed.length})
                      </div>
                      {tagValidationReport.malformed.map((err, idx) => (
                        <div key={idx} className="p-2 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800">
                          {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                {tagValidationReport.unknown.some(u => u.suggestion) && (
                  <button 
                    onClick={autoFixAllTags}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Tự động sửa toàn bộ
                  </button>
                )}
                <button 
                  onClick={() => setShowTagReportModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Notification Toast */}
      <AnimatePresence>
        {(error || commandFeedback) && (
          <motion.div 
            key="notification-toast"
            initial={{ opacity: 0, y: 30, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] px-5 py-3.5 rounded-2xl shadow-2xl flex items-start gap-3.5 max-w-lg w-[92vw] border backdrop-blur-md ${
              error ? 'bg-red-50/95 border-red-200 text-red-900' : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${error ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              {error ? <AlertCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">
                {error ? 'Thông báo hệ thống' : 'Thông báo'}
              </div>
              <div className="text-xs font-medium leading-relaxed">
                {error || commandFeedback}
              </div>
              {error && (error.includes('hạn mức') || error.includes('Quota') || error.includes('429')) && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setError(null);
                      handleWebSpeechPreview();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Nghe thử kịch bản bằng Web Speech ngay</span>
                  </button>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => {
                setError(null);
                setCommandFeedback(null);
              }}
              className="p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-700 transition-all shrink-0 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
