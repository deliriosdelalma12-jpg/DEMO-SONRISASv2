
import { GoogleGenAI, Modality } from "@google/genai";

// Removed getApiKey as guidelines specify obtaining it exclusively from process.env.API_KEY

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

export const decodeAudioDataToBuffer = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
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

export const speakText = async (text: string, voiceName: string, config?: { pitch?: number, speed?: number }) => {
  try {
    // Guideline: Initialize GoogleGenAI right before making an API call using process.env.API_KEY
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

export async function* streamChatResponse(message: string) {
  // Guideline: Initialize GoogleGenAI right before making an API call using process.env.API_KEY
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

export const generatePersonalityPrompt = async (tags: string[], name: string, clinic: string) => {
  // Guideline: Initialize GoogleGenAI right before making an API call using process.env.API_KEY
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
