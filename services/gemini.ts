
import { GoogleGenAI, Modality } from "@google/genai";

/**
 * Decodifica una cadena Base64 a Uint8Array de forma segura.
 */
export const decodeBase64 = (base64: string): Uint8Array => {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Error al decodificar Base64:", e);
    return new Uint8Array(0);
  }
};

/**
 * Convierte datos PCM raw (Int16) a un AudioBuffer (Float32).
 */
export const decodeAudioDataToBuffer = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  // Alineación precisa del buffer para evitar el error de "Audio no disponible" o recortes
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

/**
 * Genera audio TTS respetando estrictamente la configuración de voz y personalidad.
 */
export const speakText = async (text: string, voiceName: string, config?: { pitch?: number, speed?: number }) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { 
              voiceName: voiceName as any 
            },
          },
        },
      },
    });

    // Búsqueda exhaustiva de la parte de audio en la respuesta
    const candidates = response.candidates || [];
    let base64Audio = '';
    
    for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        const audioPart = parts.find(p => p.inlineData && p.inlineData.data);
        if (audioPart) {
            base64Audio = audioPart.inlineData.data;
            break;
        }
    }

    if (!base64Audio) {
        throw new Error("El motor TTS no devolvió datos de audio válidos.");
    }
    
    return base64Audio;
  } catch (error) {
    console.error("Error crítico en TTS:", error);
    throw error;
  }
};

/**
 * Genera una respuesta de chat en streaming.
 */
export async function* streamChatResponse(message: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: message,
    config: {
        thinkingConfig: { thinkingBudget: 0 }
    }
  });

  for await (const chunk of response) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

/**
 * Genera un prompt de personalidad maestro optimizado para latencia.
 */
export const generatePersonalityPrompt = async (tags: string[], name: string, clinic: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Escribe instrucciones de sistema CRÍTICAS Y BREVES para un asistente de voz clínico llamado ${name} para la clínica ${clinic}. 
  Usa estas etiquetas de comportamiento: ${tags.join(', ')}. 
  REGLA DE ORO: Responde siempre con menos de 10 palabras. Prohibido saludar en cada turno.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text || '';
};
