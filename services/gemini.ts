
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
  const dataInt16 = new Int16Array(data.buffer);
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
 * Genera audio TTS optimizado para velocidad.
 */
export const speakText = async (text: string, voiceName: string, options?: { pitch?: number, speed?: number }) => {
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

    const base64Audio = response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio no disponible");
    return base64Audio;
  } catch (error) {
    console.error("Error TTS:", error);
    throw error;
  }
};

/**
 * Genera una respuesta de chat en streaming (Flash es el más rápido).
 */
export async function* streamChatResponse(message: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: message,
    config: {
        thinkingConfig: { thinkingBudget: 0 } // Desactivar pensamiento profundo para máxima velocidad
    }
  });

  for await (const chunk of response) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

/**
 * Genera un prompt de personalidad maestro.
 */
export const generatePersonalityPrompt = async (tags: string[], name: string, clinic: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Escribe instrucciones de sistema ultracortas para un asistente de voz clínico llamado ${name} para la clínica ${clinic}. Estilo: ${tags.join(', ')}. Responde siempre de forma breve.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text || '';
};
