# Callify - Hotel Voice AI

Welcome to **Callify**, your premium 24/7 AI Voice Receptionist exclusively for hotels. This project was built from scratch with a mission to deliver a state-of-the-art guest experience using Next.js, Supabase, and Voice AI.

## 🚀 Key Project Components

| Module                     | Description                                                                                                              | Status         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------- |
| **Landing & Pricing**      | Premium dark-mode introduction to Callify with detailed pricing cards for Boutique, Professional, and Enterprise hotels. | ✅ Implemented |
| **Merchant Dashboard**     | A glassmorphism interface featuring overview metrics, an interactive Inventory calendar, and detailed call analytics.    | ✅ Implemented |
| **Onboarding Flow**        | A streamlined configuration page for hotel managers to upload knowledge bases (PDFs) and sync PMS keys.                  | ✅ Implemented |
| **Supabase Schema**        | A production-ready SQL structure for \`Hotels\`, \`Rooms\`, \`Reservations\`, \`HotelServices\`, and \`CallLogs\`.       | ✅ Implemented |
| **AI Persona & Config**    | Strictly bounded hotel prompt designed to handle room bookings while rejecting off-topic queries.                        | ✅ Implemented |
| **Voice AI Simulation**    | A built-in testing interface to simulate the AI's response logic directly within the app.                                | ✅ Implemented |
| **Twilio IVR Payment Hub** | Foundational API routing for secure DTMF-based payment collection over the phone.                                        | ✅ Implemented |

## 🛠️ Local Development

To run the project locally, follow these steps:

1. **Install Dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Supabase Setup:**
   - Go to your Supabase project dashboard.
   - Run the provided \`supabase_schema.sql\` in the SQL Editor.

3. **Environment Config:**
   - Ensure you update \`.env.local\` with your active Supabase URL and Keys.

4. **Launch Application:**
   \`\`\`bash
   npm run dev
   \`\`\`

## 🏗️ Project Architecture

\`\`\`mermaid
graph TD
A[Public Landing Page] --> B{Onboarding Flow}
B --> C[Merchant Dashboard]
C --> D[Real-time Overview]
C --> E[Inventory Calendar]
C --> F[Call Analytics]
C --> G[Demo / Simulator]
H[Voice Call] --> I[Twilio Webhook]
I --> J[AI Logic / TTS]
J --> K[Supabase DB / Room Management]
\`\`\`

## ✨ Design Choices

- **Aesthetics:** Dark-mode glassmorphism with vivid cyan and purple neon accents for a high-end SaaS feel.
- **Typography:** Using _Space Grotesk_ for a modern, tech-forward appearance.
- **Micro-interactions:** Custom hover states, glowing borders, and smooth transitions on all interactive components.
