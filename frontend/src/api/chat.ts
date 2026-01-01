import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add user ID header
api.interceptors.request.use(config => {
  // For demo purposes, using a fixed user ID
  // In production, this should come from authentication
  config.headers['X-User-Id'] = localStorage.getItem('userId') || '1'
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export interface Session {
  id: number
  title: string
  modelProvider: string
  modelName: string
  systemPrompt?: string
  contextWindowSize: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  messages?: Message[]
}

export interface Message {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  modelUsed?: string
  createdAt: string
}

export interface ChatRequest {
  sessionId?: number
  message: string
  modelProvider?: string
  modelName?: string
  systemPrompt?: string
  contextWindowSize?: number
}

export interface ChatResponse {
  sessionId: number
  messageId: number
  content: string
  role: string
  modelUsed: string
}

// Session APIs
export const getSessions = () => api.get<Session[]>('/chat/sessions')

export const getSession = (sessionId: number) => 
  api.get<Session>(`/chat/sessions/${sessionId}`)

export const createSession = (data: {
  title?: string
  modelProvider?: string
  modelName?: string
  systemPrompt?: string
  contextWindowSize?: number
}) => api.post<Session>('/chat/sessions', data)

export const updateSession = (sessionId: number, data: { title?: string }) =>
  api.patch(`/chat/sessions/${sessionId}`, data)

export const deleteSession = (sessionId: number) =>
  api.delete(`/chat/sessions/${sessionId}`)

// Message APIs
export const sendMessage = (data: ChatRequest) =>
  api.post<ChatResponse>('/chat/messages', data)

// Streaming message API
export const sendMessageStream = async (
  data: ChatRequest,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) => {
  try {
    const response = await fetch('/api/chat/messages/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': localStorage.getItem('userId') || '1'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No response body')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        onComplete()
        break
      }
      const chunk = decoder.decode(value, { stream: true })
      // Parse SSE data
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim()
          if (data) {
            onChunk(data)
          }
        } else if (line.trim()) {
          onChunk(line)
        }
      }
    }
  } catch (error) {
    onError(error as Error)
  }
}

// Memory APIs
export interface Memory {
  id: number
  content: string
  summary?: string
  importance: number
  accessCount: number
  lastAccessedAt?: string
  createdAt: string
}

export const getMemories = (limit = 50) =>
  api.get<Memory[]>('/memory', { params: { limit } })

export const storeMemory = (data: {
  content: string
  summary?: string
  importance?: number
}) => api.post<Memory>('/memory', data)

export const searchMemories = (query: string, topK = 5) =>
  api.get<Memory[]>('/memory/search', { params: { query, topK } })

export default api
