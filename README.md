# WorkPro Mobile

A field service mobile application prototype built for Bigge Crane and Rigging's WorkPro platform. This demo showcases a modern React Native mobile experience with bi-directional Salesforce integration.

**Built in a few hours as a technical exploration.**

![React Native](https://img.shields.io/badge/React_Native-Expo-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![.NET](https://img.shields.io/badge/.NET-9.0-purple)
![Salesforce](https://img.shields.io/badge/Salesforce-JWT_OAuth-00A1E0)

---

## Demo

📱 **[Watch Demo Video](Demo.mp4)**

> *Tip: For inline video playback on GitHub, edit this README on GitHub.com and drag-drop the Demo.mp4 file into the editor to generate an embedded video link.*

---

## Overview

WorkPro Mobile enables field technicians to manage service jobs, update statuses, and navigate to job sites—all synced in real-time with Salesforce.

### Features

- **Job Management** — View, create, and update field service work orders
- **Status Tracking** — Visual progress pipeline (Dispatched → En Route → In Progress → Complete)
- **Native Maps** — Embedded maps with one-tap navigation to job sites
- **Salesforce Sync** — Bi-directional sync with Salesforce Cases via JWT Bearer OAuth 2.0
- **Pull to Refresh** — Real-time updates from Salesforce
- **Dark Mode** — Full light/dark theme support
- **Bigge Branding** — Custom branded UI with company colors and assets

---

## Tech Stack

### Mobile App
- **React Native** with Expo
- **TypeScript**
- **NativeWind** (Tailwind CSS for React Native)
- **Expo Router** (file-based navigation)
- **react-native-maps** (native map integration)

### Backend API
- **ASP.NET Core** minimal API (.NET 9)
- **C#**
- RESTful endpoints for job CRUD operations
- Salesforce integration layer

### Salesforce Integration
- **JWT Bearer OAuth 2.0** flow (certificate-based auth)
- Bi-directional sync — Create jobs in app → appear as Cases in Salesforce
- Status updates flow both directions
- No password storage required

---

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  React Native   │◄───────►│   C# .NET API   │◄───────►│   Salesforce    │
│  Mobile App     │  REST   │                 │  JWT    │   (Cases)       │
│                 │         │                 │  OAuth  │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## Demo Flow

1. **View Jobs** — Job list pulls from API with status badges and priority indicators
2. **Create Job** — Form creates work order, automatically syncs to Salesforce as a Case
3. **Toggle Data Source** — Switch between local API and Salesforce-sourced data
4. **Update Status** — Change status in app or Salesforce; pull to refresh syncs both ways
5. **Navigate** — Tap any job to see details with embedded map; one tap opens native navigation

---

## Running Locally

### Prerequisites
- Node.js 18+
- .NET 9 SDK
- Expo Go app on your phone
- ngrok (for mobile testing)
- Salesforce Developer Org (optional, for full sync demo)

### API Setup

```bash
cd api/WorkProApi
dotnet restore
dotnet run
```

API runs on `http://localhost:5272`

### Mobile App Setup

```bash
npm install
npx expo start
```

Scan QR code with Expo Go.

### Environment Variables

Create `.env` in project root:
```
EXPO_PUBLIC_API_URL=http://localhost:5272
```

For mobile device testing, use ngrok:
```bash
ngrok http 5272
```

Then update `.env` with the ngrok URL.

---

## Salesforce Configuration (Optional)

For bi-directional Salesforce sync:

1. Create a Connected App with JWT Bearer flow enabled
2. Generate certificate (`openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt`)
3. Upload `server.crt` to Connected App
4. Set environment variables for the API:
   - `SF_INSTANCE_URL`
   - `SF_CLIENT_ID`
   - `SF_USERNAME`
   - `SF_PRIVATE_KEY_PATH`

---

## Project Structure

```
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Jobs list
│   │   └── explore.tsx    # Create job form
│   └── job/
│       └── [id].tsx       # Job detail with map
├── lib/
│   ├── api.ts             # API client
│   └── geocode.ts         # Address geocoding
├── types/
│   └── index.ts           # TypeScript interfaces
├── api/
│   └── WorkProApi/        # C# backend
│       └── Program.cs     # Minimal API with Salesforce integration
└── assets/
    └── images/            # Bigge branding assets
```

---

## Why This Stack?

| Requirement | Solution | Rationale |
|-------------|----------|-----------|
| Mobile-first field experience | React Native + Expo | Native performance, single codebase for iOS/Android |
| Offline capability (future) | React Native | First-class offline support via local storage/SQLite |
| Existing Microsoft backend | C# .NET API | Seamless integration with existing Bigge infrastructure |
| Salesforce sync | JWT OAuth | Secure, MFA-compatible, no password storage |
| Rapid development | TypeScript + Tailwind | Type safety + utility-first styling = fast iteration |

---

## Author

**Keenan Chiasson**  
Senior Full-Stack Cloud Developer  
[LinkedIn](https://linkedin.com/in/keenan-chiasson)

---

*This prototype was built as a technical exploration for Bigge Crane and Rigging's WorkPro platform modernization initiative.*