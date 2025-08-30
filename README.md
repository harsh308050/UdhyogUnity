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

2. Install dependencies:
  ``` bash
  npm install
  ```

3. Start the development server:

    ```bash
    npm run dev
    ```

4. Build for production:
   ```bash
   npm run build
   ```

## 📸 Preview:
<h3> <a href="https://udhyogunity.netlify.app/"> https://udhyogunity.netlify.app/ <a></h3>


## 📂 Project Structure

```
.
├── index.html
├── package.json
├── netlify.toml
├── public/
│   └── _redirects
├── netlify/
│   └── functions/
│       └── send-contact-email.mjs
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── App.css
│   ├── assets/               # Images and static assets (logos, icons, illustrations)
│   ├── components/           # React components
│   │   ├── LandingPage.jsx
│   │   ├── Login.jsx
│   │   ├── RegisterBusiness.jsx
│   │   ├── BusinessLogin.jsx
│   │   ├── BusinessOwner/     # Dashboard, Products, Services, Messages, Orders, Settings
│   │   └── miniComponents/    # Small reusable components (forms, modals, rating, reviews)
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── Firebase/             # Firebase helpers and integration
│   │   ├── auth.js
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── cloudinary.js
│   │   ├── storage.js
│   │   └── ...other db/util files
│   └── utils/                # Utilities (razorpay, call utils, audio debug, etc.)
├── README.md
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
- Navigate to `/login` to access the login/signup page.
- Navigate to `/register-business` to register a new business.
- Navigate to `/business-login` to login business.

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
Linkedin - [https://www.linkedin.com/in/harsh308050/](https://www.linkedin.com/in/harsh308050/)
Project Link: [https://github.com/harsh308050/UdhyogUnity](https://github.com/harsh308050/UdhyogUnity)

---

Made with ❤️ by Harsh Parmar
