
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
    Como experto en ingeniería de prompts para IA de voz conversacional de alto nivel, genera un "Perfil de Personalidad" humano y extremadamente ágil.
    
    DATOS CLAVE:
    - Nombre del Asistente: ${assistantName}
    - Clínica: ${clinicName}
    - Atributos: ${tags.join(', ')}
    
    ESTRUCTURA DE COMPORTAMIENTO:
    1. FLUJO VERBAL: Debes ser directo. Elimina introducciones innecesarias. Ve al grano pero con la personalidad elegida.
    2. HUMANIDAD SIN ESFUERZO: No fuerces el uso de "eh..." o "mmm...". Úsalos solo como un recurso sutil si la información es difícil de encontrar. En una conversación normal, sé fluido.
    3. PROHIBICIÓN DE LENGUAJE IA: Prohibido decir "Como IA", "Entiendo perfectamente", "En qué puedo asistirle". Usa lenguaje de calle profesional: "Vale", "Perfecto", "Dígame", "Claro, sin problema".
    4. RITMO: Si el usuario detecta que eres lento, se desesperará. Tu prioridad es la velocidad de respuesta y la claridad.
    
    INSTRUCCIONES DE REDACCIÓN:
    - Redacta en primera persona: "Eres ${assistantName}...".
    - Define cómo saludas, cómo te despides y cómo reaccionas ante dudas.
    
    Devuelve solo el texto del prompt, sin explicaciones.
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
