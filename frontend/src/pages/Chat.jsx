import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Mic, Volume2, Archive, Trash2, Edit2, Plus, Menu, LogOut, User } from 'lucide-react'
import { chatService } from '../services/api'

export default function Chat({ user }) {
    const [chats, setChats] = useState([])
    const [activeChatId, setActiveChatId] = useState(null)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [language, setLanguage] = useState(user?.language || 'fr')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)
    const recognitionRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const fetchChats = useCallback(async () => {
        try {
            const data = await chatService.getChats()
            setChats(data)
            if (data.length > 0 && !activeChatId) {
                setActiveChatId(data[0].id)
            }
        } catch (error) {
            console.error("Error fetching chats:", error)
        }
    }, [activeChatId])

    useEffect(() => {
        fetchChats()
    }, [fetchChats])

    useEffect(() => {
        const fetchMessages = async () => {
            if (!activeChatId) {
                setMessages([])
                return
            }
            try {
                const data = await chatService.getChatSession(activeChatId)
                setMessages(data.messages)
            } catch (error) {
                console.error("Error fetching messages:", error)
            }
        }
        fetchMessages()
    }, [activeChatId])

    const createNewChat = async () => {
        try {
            const newChat = await chatService.createChat()
            setChats(prev => [newChat, ...prev])
            setActiveChatId(newChat.id)
            setMessages(newChat.messages || [])
            if (window.innerWidth < 768) setSidebarOpen(false)
        } catch (error) {
            console.error("Error creating chat:", error)
        }
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!input.trim() || loading) return

        let currentChatId = activeChatId

        // Auto-create chat if none selected
        if (!currentChatId) {
            try {
                const newChat = await chatService.createChat(input.substring(0, 30) + '...')
                currentChatId = newChat.id
                setChats(prev => [newChat, ...prev])
                setActiveChatId(currentChatId)
            } catch (e) {
                console.error(e)
                return
            }
        }

        const userText = input
        setInput('')

        // Optimistic UI update
        const tempId = Date.now()
        setMessages(prev => [...prev, { id: tempId, text: userText, content: userText, sender: 'user' }])
        setLoading(true)

        try {
            const botResponse = await chatService.sendMessage(currentChatId, userText, language)

            // Re-fetch all messages to ensure we have the correct DB state & IDs
            const chatData = await chatService.getChatSession(currentChatId)
            setMessages(chatData.messages)

            // Update chat title if it's the first real message
            if (chats.find(c => c.id === currentChatId)?.title === 'Nouvelle discussion') {
                await chatService.renameChat(currentChatId, userText.substring(0, 30) + '...')
                fetchChats()
            }
        } catch (error) {
            console.error("Error sending message:", error)
            setMessages(prev => [...prev, { id: Date.now() + 1, content: "Désolé, une erreur de connexion est survenue.", sender: 'bot' }])
        } finally {
            setLoading(false)
            scrollToBottom()
        }
    }

    const handleDeleteChat = async (e, id) => {
        e.stopPropagation()
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette discussion ?")) return
        try {
            await chatService.deleteChat(id)
            if (activeChatId === id) setActiveChatId(null)
            fetchChats()
        } catch (error) {
            console.error(error)
        }
    }

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop()
            setIsRecording(false)
            return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            alert("Votre navigateur ne supporte pas la reconnaissance vocale.")
            return
        }

        const recognition = new SpeechRecognition()
        recognition.lang = language === 'fr' ? 'fr-FR' : 'mg-MG' // mg-MG might fallback, but we'll try
        recognition.continuous = false
        recognition.interimResults = false

        recognition.onstart = () => {
            setIsRecording(true)
        }

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript
            setInput(prev => prev + (prev ? ' ' : '') + transcript)
        }

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error)
            setIsRecording(false)
        }

        recognition.onend = () => {
            setIsRecording(false)
        }

        recognitionRef.current = recognition
        recognition.start()
    }

    const playAudio = (text) => {
        if (!text) return

        // Use browser's native TTS (free and local)
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = language === 'fr' ? 'fr-FR' : 'fr-FR' // Browsers rarely support Malagasy TTS natively, fallback to French voice reading it
        window.speechSynthesis.cancel() // Stop any current speech
        window.speechSynthesis.speak(utterance)
    }

    return (
        <div className="flex h-full w-full bg-white relative overflow-hidden">

            {/* Mobile sidebar toggle overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Chat History */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50
                w-80 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-2xl md:shadow-none
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 border-b bg-white flex flex-col gap-5">
                    <button
                        onClick={createNewChat}
                        className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-torolalana-dark text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-lg active:scale-95 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        <span>Discussion vaovao</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
                    {chats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => { setActiveChatId(chat.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                            className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border-2 ${activeChatId === chat.id ? 'bg-white border-torolalana-primary shadow-sm' : 'border-transparent hover:bg-white hover:border-slate-200'}`}
                        >
                            <span className={`text-sm truncate pr-2 ${activeChatId === chat.id ? 'text-torolalana-primary font-bold' : 'text-slate-600 font-medium'}`}>
                                {chat.title}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => handleDeleteChat(e, chat.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                    {chats.length === 0 && (
                        <div className="text-center py-10 px-4 text-xs text-slate-400 font-bold uppercase tracking-widest opacity-60">
                            Tsy misy tantara
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white mt-auto">
                    {/* Language Toggle */}
                    <div className="flex items-center justify-between mb-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <button
                            onClick={() => setLanguage('fr')}
                            className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${language === 'fr' ? 'bg-white text-torolalana-primary shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            FRANÇAIS
                        </button>
                        <button
                            onClick={() => setLanguage('mg')}
                            className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${language === 'mg' ? 'bg-white text-torolalana-primary shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            MALAGASY
                        </button>
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 p-3 bg-slate-900 text-white rounded-2xl shadow-xl">
                        <div className="w-10 h-10 rounded-xl bg-torolalana-primary text-white flex items-center justify-center font-black shadow-lg shrink-0 overflow-hidden transform rotate-3">
                            {user?.name?.charAt(0).toUpperCase() || <User size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate text-white uppercase tracking-tighter">
                                {user?.name || 'Utilisateur'}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                localStorage.removeItem('token')
                                localStorage.removeItem('user')
                                window.location.reload()
                            }}
                            className="p-2 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">

                {/* Mobile Header Overlay (only visible when sidebar closed on mobile) */}
                <div className="md:hidden absolute top-4 left-4 z-30">
                    <button onClick={() => setSidebarOpen(true)} className="p-3 bg-white border border-slate-200 text-slate-600 shadow-xl rounded-2xl hover:bg-slate-50">
                        <Menu size={20} />
                    </button>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto px-4 md:px-0 custom-scrollbar scroll-smooth">
                    <div className="max-w-3xl mx-auto py-10 md:py-20 space-y-8 pb-32">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center grayscale opacity-50">
                                    <img src="https://torolalana.gov.mg/static/733d84e479b65c1473368ccdf81c2dd8/landing_page_cover_8e5eca16bf.svg" alt="Wait" className="w-12 h-12" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Manomboha resaka</h3>
                                    <p className="text-slate-400 text-sm font-medium">Inona no azoko ampiana anao anio?</p>
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-4 md:gap-6 group ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <div className="flex flex-col items-center shrink-0">
                                    {msg.sender === 'bot' ? (
                                        <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-torolalana-primary text-white flex items-center justify-center shadow-lg shadow-torolalana-primary/20 transform -rotate-3 transition-transform group-hover:rotate-0">
                                            <img src="https://torolalana.gov.mg/static/733d84e479b65c1473368ccdf81c2dd8/landing_page_cover_8e5eca16bf.svg" alt="B" className="w-5 h-5 md:w-6 md:h-6 object-contain invert" />
                                        </div>
                                    ) : (
                                        <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-slate-900/10">
                                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>

                                <div className={`flex-1 min-w-0 flex flex-col gap-1.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-center gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            {msg.sender === 'bot' ? 'Assistant Torolalana' : (user?.name || 'Utilisateur')}
                                        </span>
                                        {msg.sender === 'bot' && (
                                            <button
                                                onClick={() => playAudio(msg.content || msg.text)}
                                                className="p-1 text-slate-300 hover:text-torolalana-primary transition-colors opacity-0 group-hover:opacity-100"
                                                title="Audio"
                                            >
                                                <Volume2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className={`
                                        relative max-w-[85%] md:max-w-[80%] rounded-2xl md:rounded-3xl px-6 py-4 transition-all
                                        ${msg.sender === 'user'
                                            ? 'bg-slate-900 text-white shadow-xl rounded-tr-none'
                                            : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tl-none'}
                                    `}>
                                        <div
                                            className={`whitespace-pre-wrap text-sm md:text-[15px] leading-relaxed markdown-content ${msg.sender === 'user' ? 'text-white' : 'text-slate-700'}`}
                                            dangerouslySetInnerHTML={{
                                                __html: (msg.content || msg.text)
                                                    ?.replace(/\n/g, '<br/>')
                                                    ?.replace(/\*\*(.*?)\*\*/g, `<strong class="${msg.sender === 'user' ? 'text-white font-black' : 'text-torolalana-primary font-black'}">$1</strong>`)
                                                    ?.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="inline-flex items-center gap-1 text-torolalana-primary hover:underline font-bold bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 transition-colors">$1</a>')
                                                    ?.replace(/^- (.*)/gm, `<div class="flex gap-2 mb-1"><span class="${msg.sender === 'user' ? 'text-white/60' : 'text-torolalana-primary'} font-black">•</span><span>$1</span></div>`)
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-4 justify-start">
                                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center animate-pulse">
                                    <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
                                </div>
                                <div className="bg-slate-50 rounded-3xl px-6 py-4 flex gap-1 items-center shadow-inner">
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Fixed Input Area at the bottom */}
                <div className="shrink-0 bg-white border-t border-slate-100 p-4 md:p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                    <div className="max-w-3xl mx-auto">
                        <div className="relative bg-slate-50 rounded-[2rem] border-2 border-slate-100 focus-within:border-torolalana-primary focus-within:bg-white focus-within:shadow-2xl focus-within:shadow-torolalana-primary/5 transition-all p-2 flex items-end gap-2 group">
                            <button
                                type="button"
                                onClick={toggleRecording}
                                className={`p-4 rounded-3xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-600 hover:bg-white hover:shadow-md'}`}
                            >
                                <Mic size={22} strokeWidth={2.5} />
                            </button>

                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={language === 'fr' ? "Écrivez ici..." : "Manorata eto..."}
                                className="flex-1 max-h-40 min-h-[56px] py-4 bg-transparent border-0 focus:ring-0 resize-none outline-none text-[15px] font-medium text-slate-700 placeholder:text-slate-300"
                                rows="1"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend(e);
                                    }
                                }}
                            />

                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className={`p-4 rounded-[1.5rem] transition-all transform active:scale-90 ${input.trim() && !loading ? 'bg-torolalana-primary text-white shadow-xl shadow-torolalana-primary/30 hover:-translate-y-1' : 'bg-slate-200 text-slate-400 opacity-50'}`}
                            >
                                <Send size={22} strokeWidth={2.5} />
                            </button>
                        </div>
                        <p className="text-center mt-3 text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">
                            Torolalana Chatbot • Fampandrenesana mialoha
                        </p>
                    </div>
                </div>

            </main>
        </div>
    )
}
