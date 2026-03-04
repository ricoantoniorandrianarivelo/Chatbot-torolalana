import { useState } from 'react'

import { authService } from '../services/api'

export default function Login({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [language, setLanguage] = useState('fr') // 'fr' or 'mg'
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Basic validation
        if (!email || !password || (!isLogin && !name)) {
            setError('Veuillez remplir tous les champs / Fenoy ny banga rehetra')
            return
        }

        setLoading(true)
        try {
            if (isLogin) {
                const data = await authService.login(email, password)
                onLogin(data.user)
            } else {
                await authService.register(name, email, password, language)
                // Automatically login after successful registration
                const loginData = await authService.login(email, password)
                onLogin(loginData.user)
            }
        } catch (err) {
            console.error(err)
            if (err.response?.data?.detail) {
                setError(err.response.data.detail)
            } else {
                setError("Une erreur s'est produite. Veuillez réessayer.")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="bg-white/80 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-md border border-white/40 transform transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-8">
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            <img
                                src="https://torolalana.gov.mg/static/733d84e479b65c1473368ccdf81c2dd8/landing_page_cover_8e5eca16bf.svg"
                                alt="Torolalana Logo"
                                className="h-16 w-auto"
                            />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                        {isLogin ? 'Tongasoa' : 'Hiaraka'}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                        {isLogin
                            ? (language === 'fr' ? 'Connectez-vous pour continuer' : 'Midira hanohizana ny resaka')
                            : (language === 'fr' ? 'Créez votre compte en quelques secondes' : 'Amboary ny kaontinao ao anatin\'ny segondra vitsy')}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nom / Anarana</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-torolalana-primary/10 focus:border-torolalana-primary focus:bg-white outline-none transition-all placeholder:text-gray-300"
                                placeholder="Votre nom"
                            />
                        </div>
                    )}

                    <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email / Mailaka</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-torolalana-primary/10 focus:border-torolalana-primary focus:bg-white outline-none transition-all placeholder:text-gray-300"
                            placeholder="votre@email.com"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mot de passe / Tenimiafina</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-torolalana-primary/10 focus:border-torolalana-primary focus:bg-white outline-none transition-all placeholder:text-gray-300"
                            placeholder="••••••••"
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Langue Préférée / Fiteny</label>
                            <div className="flex gap-3">
                                <label className={`flex-1 flex items-center justify-center cursor-pointer p-3 border-2 rounded-2xl transition-all ${language === 'fr' ? 'border-torolalana-primary bg-torolalana-primary text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                                    <input type="radio" name="language" value="fr" checked={language === 'fr'} onChange={(e) => setLanguage(e.target.value)} className="hidden" />
                                    <span className="font-bold text-xs">FRANÇAIS</span>
                                </label>
                                <label className={`flex-1 flex items-center justify-center cursor-pointer p-3 border-2 rounded-2xl transition-all ${language === 'mg' ? 'border-torolalana-primary bg-torolalana-primary text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                                    <input type="radio" name="language" value="mg" checked={language === 'mg'} onChange={(e) => setLanguage(e.target.value)} className="hidden" />
                                    <span className="font-bold text-xs">MALAGASY</span>
                                </label>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-[0.98] ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-torolalana-primary to-torolalana-dark hover:shadow-xl hover:shadow-torolalana-primary/20 hover:-translate-y-0.5'}`}
                    >
                        {loading ? 'Chargement...' : (isLogin ? 'HIDITRA / CONNEXION' : 'HAMAFISEINA / VALIDER')}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin)
                            setError('')
                        }}
                        className="text-slate-400 hover:text-torolalana-primary text-xs font-bold tracking-wider transition-colors"
                    >
                        {isLogin ? "HAMORONA KAONTY / CRÉER UN COMPTE" : 'EFA MANANA KAONTY / DÉJÀ INSCRIT'}
                    </button>
                </div>
            </div>
        </div>
    )
}
