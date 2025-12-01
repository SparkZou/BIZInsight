# Frontend - NZCompanies Platform

React + Vite + Tailwind CSS frontend for the NZCompanies Business Intelligence Platform.

## 🚀 Tech Stack

- **React** 19.2.0
- **Vite** 7.2.4
- **TypeScript** 5.9.3
- **Tailwind CSS** 3.4.17
- **React Router DOM** 7.9.6
- **Recharts** 3.5.1 (Charts)
- **Three.js** + React Three Fiber (3D Graphics)
- **Leaflet** + React Leaflet (Maps)
- **Lucide React** (Icons)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   │   ├── Background3D.tsx
│   │   ├── ContactForm.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── Navbar.tsx
│   ├── pages/          # Page components
│   │   ├── LandingPage.tsx
│   │   ├── Dashboard.tsx
│   │   ├── SearchPage.tsx
│   │   └── CompanyDetailsPage.tsx
│   ├── types/          # TypeScript types
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
└── index.html          # HTML template
```

## 🛠️ Development

### Prerequisites
- Node.js >= 18.x
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will run at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 Features

### Landing Page
- 3D animated starfield background
- Typewriter effect headlines
- Pricing tiers display
- Contact form

### Dashboard
- Real-time statistics cards
- Interactive charts (bar, pie)
- Recent registrations table

### Search
- Multi-field search (name, NZBN, address, director)
- Real-time results
- Pagination

### Company Details
- Complete company information
- Directors and shareholders lists
- Interactive map with company location

## 🔧 Configuration

### API Endpoint
Update the API base URL in component files if needed:
```typescript
const API_URL = 'http://localhost:8000/api/v1';
```

### Tailwind Configuration
Custom colors and styles are defined in `tailwind.config.js`:
- `neon-blue`: #00f3ff
- `neon-purple`: #bc13fe
- `neon-green`: #0aff00

## 📦 Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory. Deploy to any static hosting service (Nginx, Vercel, Netlify, etc.).

## 🌐 Environment Variables

Create a `.env` file if needed:
```
VITE_API_URL=http://localhost:8000
```

## 📝 Notes

- The app uses React Router for client-side routing
- All API calls should go through the backend at `http://localhost:8000`
- 3D graphics may impact performance on low-end devices
