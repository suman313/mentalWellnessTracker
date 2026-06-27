# MindMate — Mental Wellness Tracker

## Vertical
Mental Wellness Tracker for Indian competitive exam students (NEET, JEE, CUET, CAT, GATE, UPSC)

## Approach and Logic
- Student logs daily mood (1–10) and free-form journal entry
- Google Gemini 1.5 Flash analyzes journal + 7-day mood history
- AI companion gives hyper-personalized coping strategies, mindfulness exercises, and motivational support
- Mood trends visualized with SVG chart and streak tracking

## How the Solution Works
1. User selects exam type and logs mood + journal
2. Context (exam, mood, history) is sent to Gemini via serverless API
3. Gemini responds as an empathetic companion with contextual wellness support
4. All data stored in localStorage — no account needed
5. Insights tab shows patterns and allows AI pattern analysis

## Tech Stack
- Frontend: React + Vite
- AI: Google Gemini 1.5 Flash
- Deployment: Vercel (serverless functions)
- Storage: localStorage

## Assumptions
- Single user per browser session
- Internet connection required for AI responses
- Gemini API key set as environment variable on Vercel
