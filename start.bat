@echo off
echo ===================================================
echo     Demarrage du Chatbot Administratif Torolalana
echo ===================================================
echo.

echo [1/2] Lancement du Backend FastAPI...
start "Backend - Chatbot" cmd /k "cd backend && .\venv\Scripts\activate && uvicorn app.main:app --port 8000"

echo [2/2] Lancement du Frontend React...
start "Frontend - Chatbot" cmd /k "cd frontend && npm run dev"

echo.
echo Les serveurs sont en cours de demarrage dans de nouvelles fenetres.
echo - Le backend sera disponible sur : http://localhost:8000
echo - Le frontend sera disponible sur : http://localhost:5174
echo.
echo Vous pouvez fermer cette feneêtre.
pause
