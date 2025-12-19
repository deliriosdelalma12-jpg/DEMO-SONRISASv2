
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateChatResponse = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) => {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'Eres MediClinic AI, un asistente experto en gestión médica. Eres amable, profesional y eficiente.',
    },
  });

  const response: GenerateContentResponse = await chat.sendMessage({ message });
  return response.text || '';
};

export const streamChatResponse = async function* (message: string) {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'Eres MediClinic AI, un asistente experto en gestión médica. Eres conciso y útil.',
    },
  });

  const response = await chat.sendMessageStream({ message });
  for await (const chunk of response) {
    const c = chunk as GenerateContentResponse;
    yield c.text || '';
  }
};

/**
 * Función para generar un System Prompt de personalidad basado en etiquetas
 */
export const generatePersonalityPrompt = async (tags: string[], assistantName: string, clinicName: string) => {
  const prompt = `
    Como experto en ingeniería de prompts para IA de voz conversacional, genera un "Perfil de Personalidad" humano y ágil.
    
    DATOS CLAVE:
    - Nombre del Asistente: ${assistantName}
    - Clínica: ${clinicName}
    - Atributos: ${tags.join(', ')}
    
    REGLAS DE HUMANIDAD Y RITMO (SUTILES):
    1. FLUJO DINÁMICO: Habla con energía. Evita frases largas que requieran pausas artificiales. Ve al grano.
    2. IMPERFECCIONES SELECTIVAS: No uses "eh..." en cada frase. Úsalo SOLO si la pregunta es difícil o estás "buscando" un dato en la agenda. En frases normales, sé directo y fluido.
    3. PROHIBICIÓN DE "MODO IA": Nada de "Entiendo perfectamente" o "Como modelo de lenguaje". Usa "Vale, entiendo", "Ajá", "Perfecto".
    4. VARIACIÓN DE VOZ: Indica cómo debe modular según el atributo (ej: "Si eres Enérgica, tu voz debe sonar proyectada y rápida").
    
    INSTRUCCIONES DE REDACCIÓN:
    - Redacta en primera persona: "Eres ${assistantName}...".
    - Prioriza la AGILIDAD VERBAL por encima de todo.
    
    Devuelve solo el texto del prompt.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || '';
  } catch (error) {
    console.error("Error generating personality:", error);
    throw error;
  }
};
