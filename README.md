# NexVenue Web

A production-ready Next.js web application for the NexVenue platform, designed to complement the mobile experience with a premium, dashboard-focused UX.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Modern, premium design system)
- **Auth & Database:** Firebase Web SDK (Auth, Firestore, Storage)
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Getting Started

### 1. Prerequisite: Add Environment Variables

Create a `.env.local` file in the root directory and add your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Architecture & Integration

This project is built as a separate, independent web application that shares the same Firebase backend as the NexVenue mobile app.

- **Types:** Domain models located in `types/` are matched with the mobile reference implementation.
- **Services:** Firestore interactions in `services/` follow the same collection patterns and document shapes.
- **Design:** Implements a custom web design system with glassmorphism and high information density, optimized for desktop and mobile browsers.

## Project Structure

```text
app/            # Next.js App Router (Auth, Dashboard, Marketing)
components/     # Reusable UI & Feature components
lib/            # Shared utilities (Firebase config, helpers)
services/       # API/Database interaction layer
types/          # Shared TypeScript definitions
```

## Contributing

For any logic changes that affect data contracts, ensure parity with the mobile application's expected document shapes in Firestore.
