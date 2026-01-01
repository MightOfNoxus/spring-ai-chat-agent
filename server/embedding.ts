import { invokeLLM } from "./_core/llm";

/**
 * Simple in-memory vector store for semantic search
 * In production, this would be replaced with a proper vector database like Pinecone
 */

export interface VectorEntry {
  id: number;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

/**
 * Generate text embedding using LLM
 * Uses a simple approach by asking the model to extract key concepts
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // For simplicity, we'll use a hash-based approach for embeddings
  // In production, you would use OpenAI's embedding API or similar
  const embedding = simpleTextToVector(text);
  return embedding;
}

/**
 * Simple text to vector conversion using character-based hashing
 * This is a simplified implementation for demonstration
 */
function simpleTextToVector(text: string, dimensions: number = 128): number[] {
  const vector: number[] = new Array(dimensions).fill(0);
  const normalizedText = text.toLowerCase().trim();
  
  // Create a simple embedding based on character frequencies and positions
  for (let i = 0; i < normalizedText.length; i++) {
    const charCode = normalizedText.charCodeAt(i);
    const index = (charCode + i) % dimensions;
    vector[index] += 1 / (1 + Math.log(i + 1));
  }
  
  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }
  
  return vector;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find most similar vectors from a collection
 */
export function findSimilar(
  queryEmbedding: number[],
  vectors: VectorEntry[],
  topK: number = 5,
  threshold: number = 0.3
): Array<VectorEntry & { similarity: number }> {
  const results = vectors
    .map(entry => ({
      ...entry,
      similarity: cosineSimilarity(queryEmbedding, entry.embedding)
    }))
    .filter(entry => entry.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
  
  return results;
}

/**
 * Summarize content for long-term memory storage
 */
export async function summarizeForMemory(content: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes conversations into concise, memorable points. Extract the key information, decisions, and important facts."
        },
        {
          role: "user",
          content: `Please summarize the following conversation content into key points for long-term memory:\n\n${content}`
        }
      ]
    });
    
    const messageContent = response.choices[0]?.message?.content;
    return typeof messageContent === 'string' ? messageContent : content.slice(0, 500);
  } catch (error) {
    console.error("Failed to summarize content:", error);
    return content.slice(0, 500);
  }
}

/**
 * Calculate importance score for a memory
 */
export function calculateImportance(content: string, metadata?: Record<string, unknown>): number {
  let score = 0.5; // Base score
  
  // Increase score for longer, more detailed content
  if (content.length > 200) score += 0.1;
  if (content.length > 500) score += 0.1;
  
  // Check for important keywords
  const importantKeywords = ['important', 'remember', 'key', 'decision', 'conclusion', 'action', 'deadline'];
  const lowerContent = content.toLowerCase();
  for (const keyword of importantKeywords) {
    if (lowerContent.includes(keyword)) {
      score += 0.05;
    }
  }
  
  // Cap at 1.0
  return Math.min(score, 1.0);
}
