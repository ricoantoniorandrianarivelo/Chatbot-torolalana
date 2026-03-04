import axios from 'axios';

const api = axios.create({
    baseURL: 'https://chatbot-torolalana.onrender.com',
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const authService = {
    login: async (email, password) => {
        // FastAPI OAuth2PasswordBearer expects form data
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.post('/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    register: async (name, email, password, language) => {
        const response = await api.post('/register', {
            name,
            email,
            password,
            preferred_language: language
        });
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (userStr) return JSON.parse(userStr);
        return null;
    }
};

export const chatService = {
    getChats: async () => {
        const response = await api.get('/chats');
        return response.data;
    },

    createChat: async (title = 'Nouvelle discussion') => {
        const response = await api.post('/chats', { title });
        return response.data;
    },

    getChatSession: async (chatId) => {
        const response = await api.get(`/chats/${chatId}`);
        return response.data;
    },

    sendMessage: async (chatId, text, language = 'fr') => {
        const response = await api.post(`/chats/${chatId}/message`, {
            content: text,
            sender: 'user',
            language: language
        });
        return response.data;
    },

    renameChat: async (chatId, newTitle) => {
        const response = await api.put(`/chats/${chatId}/rename?title=${encodeURIComponent(newTitle)}`);
        return response.data;
    },

    archiveChat: async (chatId) => {
        const response = await api.put(`/chats/${chatId}/archive`);
        return response.data;
    },

    deleteChat: async (chatId) => {
        const response = await api.delete(`/chats/${chatId}`);
        return response.data;
    }
};

export default api;
