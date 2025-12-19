
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Correctly initialize with a named parameter using process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateChatResponse = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) => {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'Eres MediClinic AI, un asistente experto en gestión médica y atención al paciente. Eres amable, profesional y eficiente. Ayudas a doctores y personal administrativo con dudas sobre citas, pacientes y el sistema.',
    },
  });

  // Use sendMessage and access the .text property directly
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
    // Access the .text property directly in streaming response
    yield c.text || '';
  }
};
