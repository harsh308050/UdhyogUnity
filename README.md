# UdhyogUnity

![UdhyogUnity Logo](src/assets/udhyogunity.png)

UdhyogUnity is a platform dedicated to connecting cities through local businesses. Our mission is to empower local businesses and build stronger communities through digital transformation.

## 🚀 Features

- **Landing Page**: A visually appealing entry point with animated statistics and feature showcase
- **Authentication System**: Complete user authentication with email/password and Google sign-in options
- **Business Login System**: Dedicated business authentication with:
  - Email & Password login for business users
  - Phone OTP verification for secure access
- **Business Registration**: Comprehensive multi-step business registration with:
  - Business Details (Name, Type, Description, Categories)
  - Contact & Location (Google Maps integration)
  - Business Verification (Document uploads, photos, video)
  - Payment Setup (Multiple payment methods)
  - Final Review & Submission

## 🔧 Technologies Used

- **Frontend**: React, React Router, Framer Motion, Bootstrap
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **File Uploads**: Cloudinary integration
- **Maps**: Google Maps API integration
- **Build Tool**: Vite

## 📋 Prerequisites

- Node.js (v16.0.0 or later)
- npm or yarn
- Firebase account
- Cloudinary account (for image uploads)
- Google Maps API key

## 🛠️ Installation and Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/your-username/UdhyogUnity.git
    cd UdhyogUnity
    ```

2. Install dependencies:    ```bash
    npm install
    ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. Start the development server:

    ```bash
    npm run dev
    ```

5. Build for production:
   ```bash
   npm run build
   ```

## 📸 Screenshots
<h1>Landing Page </h1>

![screencapture-localhost-5173-2025-02-28-18_28_27](https://github.com/user-attachments/assets/16fb5b66-6917-4da6-8d53-bc227438cbf3)

<h1>Signin / Signup Page </h1>

![screencapture-localhost-5173-login-2025-02-28-18_28_41](https://github.com/user-attachments/assets/2b6ade44-2888-450b-8bff-e785cb7e6bc7)

![screencapture-localhost-5173-login-2025-02-28-18_29_09](https://github.com/user-attachments/assets/1ecdc221-f469-4d4a-9e18-f435fa29e054)


## 📂 Project Structure

```
src/
├── assets/               # Images and static assets
├── components/           # React components
│   ├── LandingPage.jsx   # Landing page component
│   ├── Login.jsx         # Authentication component
│   ├── RegisterBusiness.jsx  # Business registration flow
│   ├── miniComponents/   # Smaller reusable components
│   │   ├── BusinessForm/ # Business registration form steps
│   │   └── LoginForm/    # Authentication form components
│   └── styles/           # Component-specific CSS files
├── context/              # React context providers
│   └── AuthContext.jsx   # Authentication context
├── Firebase/             # Firebase configuration and utilities
│   ├── addBusiness.js    # Business data operations
│   ├── auth.js           # Authentication functions
│   ├── cloudinary.js     # Cloudinary integration
│   ├── config.js         # Firebase configuration
│   ├── db.js             # Firestore database operations
│   └── storage.js        # Firebase storage operations
├── App.jsx               # Main app component with routing
└── main.jsx              # Entry point
```

## 🧩 Key Components

- **AuthContext**: Manages user authentication state across the application
- **LandingPage**: Showcases platform features with animations and statistics
- **Login**: Handles user authentication with sign in, sign up, and password recovery
- **RegisterBusiness**: Multi-step business registration process with form validation
- **BusinessForm Components**: Individual steps of the business registration process
- **Firebase Utilities**: Integration with Firebase services for backend functionality

## 🚀 Usage

- Visit `http://localhost:5173/` to view the landing page.
- Navigate to `/login` to access the login page.
- Navigate to `/register-business` to register a new business.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 📞 Contact

Harsh Parmar - [harshparmar.dev.com](mailto:harshparmar.dev.com)

Project Link: [https://github.com/harsh308050/UdhyogUnity](https://github.com/harsh308050/UdhyogUnity)

---

Made with ❤️ for local businesses
