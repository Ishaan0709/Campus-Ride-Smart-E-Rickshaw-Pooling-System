🚖 Campus Ride – Smart E-Rickshaw Pooling System
(Software Engineering Project)

Live Website: https://campus-ride-smart-e-rickshaw-poolin-rose.vercel.app/

GitHub Repository: https://github.com/Ishaan0709/Campus-Ride-Smart-E-Rickshaw-Pooling-System

📌 Overview

Campus Ride is a smart, eco-friendly, OTP-verified E-Rickshaw pooling system built for university campuses.
It enables students, drivers, and administrators to seamlessly coordinate transportation through:

Real-time ride requests

Intelligent ride pooling

Live driver tracking

OTP-based boarding verification

Role-based authentication

Smooth UI/UX for different user types

This project was developed as a Software Engineering (SE) course project, following proper SDLC guidelines, documentation (SRS, DFD, UML), testing, and deployment.

🎯 Problem Statement

Large campuses like Thapar University face challenges:

Long walking distances between blocks

No organized real-time pooling system

Difficulty locating available E-rickshaws

Safety concerns without OTP verification

Lack of a unified platform for students & drivers

Campus Ride solves this by offering a centrally managed, ride-pooling system to reduce waiting time, congestion, and environmental impact.

🚀 Key Features
👨‍🎓 Student Module

Firebase sign-up/login

Personalized dashboard (Name, Roll No., Email)

Book a ride with:

Pickup point

Drop location

Time preference

Pool/Solo mode

Real-time status updates

Track assigned driver live on map

OTP verification system

Ride history & re-booking

Smooth, modern UI with animations

🚗 Driver Module

Firebase sign-up/login

Driver dashboard with:

Availability toggle

New ride requests

Student details & pickup point

OTP verification before ride starts

Live route & trip updates

Daily ride summary

🧑‍💼 Admin Module

Admin authentication

Seed demo data (for presentation)

Ability to:

View all students

View all drivers

Reset simulation

(Admin demo mode does not affect Student real experience.)

🗺 Live Mapping & UI

Beautiful Leaflet-based map

Glassmorphism UI theme

Route paths & live movement

Auto icons + pickup/drop markers

🛠 Tech Stack
Frontend

React (Vite + TypeScript)

Zustand (global state management)

Tailwind CSS

ShadCN UI Components

Framer Motion animations

Leaflet JS (maps)

Backend

Firebase Authentication

Firebase Firestore (user metadata)

Firestore collections:

/users

/students

/drivers

/rides

/locations

Deployment

Vercel Hosting

📁 Project Structure
src/
 ├── components/
 │    ├── MapPanel.tsx
 │    └── UI components
 ├── pages/
 │    ├── auth/
 │    │    ├── StudentAuth.tsx
 │    │    ├── DriverAuth.tsx
 │    │    └── AdminAuth.tsx
 │    ├── StudentDashboard.tsx
 │    ├── DriverDashboard.tsx
 │    └── AdminDashboard.tsx
 ├── store/
 │    ├── useAppStore.ts
 │    └── AuthContext.tsx (firebase)
 ├── lib/
 │    └── firebase.ts
 ├── App.tsx
 └── main.tsx

🔐 Role-Based Authentication

Each signup stores:

users/{uid}:
  name
  email
  role: "student" | "driver" | "admin"
  createdAt


Protected routes:

/student → Students only

/driver → Drivers only

/admin → Admin only

If a student manually types /driver → redirected safely.

🧠 Intelligent Pooling Flow

Student requests ride

System searches active drivers

Pool formed with matching routes

Driver receives request

OTP verification at pickup

Live ride tracking

Trip completion + history logging

🧪 Software Engineering Document Support

This project includes (or supports):

SRS Document

DFD Level 0, 1, 2

Use Case Diagrams

ER Diagram

Activity & Sequence Diagrams

Functional & Non-Functional Requirements

Testing Scenarios & Test Cases

🧭 How to Run Locally
1. Clone the repository
git clone https://github.com/Ishaan0709/Campus-Ride-Smart-E-Rickshaw-Pooling-System.git
cd Campus-Ride-Smart-E-Rickshaw-Pooling-System

2. Install packages
npm install

3. Setup Firebase environment

Create .env:

VITE_FIREBASE_API_KEY=xxxx
VITE_FIREBASE_AUTH_DOMAIN=xxxx
VITE_FIREBASE_PROJECT_ID=xxxx
...

4. Run
npm run dev


App will run at:

http://localhost:5173

📌 Future Improvements

Real-time driver location from GPS

Machine-learning based route pooling

Integrated wallet + payments

Panic button / safety monitoring

Admin analytics dashboard

QR boarding verification

Push notifications (FCM)

👨‍💻 Contributors

Team Project (Software Engineering Course)

Designed, developed, and maintained by:

Your Name(s)

⭐ Support

If you like this project, feel free to ⭐ star the repo!
It helps a lot and motivates further development ❤️
