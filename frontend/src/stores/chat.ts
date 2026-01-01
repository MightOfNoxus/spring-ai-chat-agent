import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session, Message } from '@/api/chat'
import * as chatApi from '@/api/chat'

export const useChatStore = defineStore('chat', () => {
  // State
  const sessions = ref<Session[]>([])
  const currentSession = ref<Session | null>(null)
  const messages = ref<Message[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const streamingContent = ref('')
  const selectedModel = ref({
    provider: 'openai',
    name: 'gpt-4'
  })

  // Getters
  const sortedSessions = computed(() => 
    [...sessions.value].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  )

  // Actions
  const fetchSessions = async () => {
    try {
      const response = await chatApi.getSessions()
      sessions.value = response.data
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const fetchSession = async (sessionId: number) => {
    try {
      isLoading.value = true
      const response = await chatApi.getSession(sessionId)
      currentSession.value = response.data
      messages.value = response.data.messages || []
    } catch (error) {
      console.error('Failed to fetch session:', error)
    } finally {
      isLoading.value = false
    }
  }

  const createNewSession = async () => {
    try {
      const response = await chatApi.createSession({
        modelProvider: selectedModel.value.provider,
        modelName: selectedModel.value.name
      })
      sessions.value.unshift(response.data)
      currentSession.value = response.data
      messages.value = []
      return response.data
    } catch (error) {
      console.error('Failed to create session:', error)
      throw error
    }
  }

  const deleteSessionById = async (sessionId: number) => {
    try {
      await chatApi.deleteSession(sessionId)
      sessions.value = sessions.value.filter(s => s.id !== sessionId)
      if (currentSession.value?.id === sessionId) {
        currentSession.value = null
        messages.value = []
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
      throw error
    }
  }

  const updateSessionTitle = async (sessionId: number, title: string) => {
    try {
      await chatApi.updateSession(sessionId, { title })
      const session = sessions.value.find(s => s.id === sessionId)
      if (session) {
        session.title = title
      }
      if (currentSession.value?.id === sessionId) {
        currentSession.value.title = title
      }
    } catch (error) {
      console.error('Failed to update session title:', error)
      throw error
    }
  }

  const sendMessage = async (content: string, useStream = true) => {
    if (!content.trim()) return

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    }
    messages.value.push(userMessage)

    const request: chatApi.ChatRequest = {
      sessionId: currentSession.value?.id,
      message: content,
      modelProvider: selectedModel.value.provider,
      modelName: selectedModel.value.name
    }

    if (useStream) {
      // Streaming response
      isStreaming.value = true
      streamingContent.value = ''

      // Add placeholder for assistant message
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString()
      }
      messages.value.push(assistantMessage)

      await chatApi.sendMessageStream(
        request,
        (chunk) => {
          streamingContent.value += chunk
          // Update the last message
          const lastMessage = messages.value[messages.value.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.content = streamingContent.value
          }
        },
        () => {
          isStreaming.value = false
          streamingContent.value = ''
          // Refresh sessions to update title if needed
          fetchSessions()
        },
        (error) => {
          console.error('Streaming error:', error)
          isStreaming.value = false
          const lastMessage = messages.value[messages.value.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.content = '抱歉，发生了错误。请重试。'
          }
        }
      )
    } else {
      // Non-streaming response
      try {
        isLoading.value = true
        const response = await chatApi.sendMessage(request)
        
        // Update session ID if new session was created
        if (!currentSession.value) {
          await fetchSession(response.data.sessionId)
          await fetchSessions()
        }

        messages.value.push({
          id: response.data.messageId,
          role: 'assistant',
          content: response.data.content,
          modelUsed: response.data.modelUsed,
          createdAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('Failed to send message:', error)
        messages.value.push({
          id: Date.now() + 1,
          role: 'assistant',
          content: '抱歉，发生了错误。请重试。',
          createdAt: new Date().toISOString()
        })
      } finally {
        isLoading.value = false
      }
    }
  }

  const setModel = (provider: string, name: string) => {
    selectedModel.value = { provider, name }
  }

  const clearCurrentSession = () => {
    currentSession.value = null
    messages.value = []
  }

  return {
    // State
    sessions,
    currentSession,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    selectedModel,
    // Getters
    sortedSessions,
    // Actions
    fetchSessions,
    fetchSession,
    createNewSession,
    deleteSessionById,
    updateSessionTitle,
    sendMessage,
    setModel,
    clearCurrentSession
  }
})
