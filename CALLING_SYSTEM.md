# Voice & Video Calling System - UdhyogUnity

## 🎯 Overview

The Voice & Video Calling MVP has been successfully implemented in UdhyogUnity's messaging module. This system allows customers and business owners to make voice and video calls directly from the chat interface using WebRTC technology.

## 🔧 Technical Architecture

### WebRTC + Firebase Integration
- **Signaling Server**: Firebase Firestore
- **STUN Server**: Google's free STUN servers (`stun:stun.l.google.com:19302`)
- **Authentication**: Firebase Auth (UID/email based)
- **Real-time Updates**: Firestore listeners for call state management

### Core Components

#### 1. CallWindow Component (`src/components/User/CallWindow.jsx`)
- **Purpose**: Main calling interface with Instagram-like UI
- **Features**:
  - Full-screen video calls with floating controls
  - Voice calls with animated avatar display
  - Real-time call duration tracking
  - Mute/unmute microphone control
  - Enable/disable camera control
  - Graceful error handling for media access
  - Call status indicators (calling, connecting, connected, ended)

#### 2. Calls Database (`src/Firebase/callsDb.js`)
- **Purpose**: Firebase integration for call management
- **Functions**:
  - `createCall()` - Create new call documents
  - `updateCallOffer()` - Store WebRTC offer
  - `updateCallAnswer()` - Store WebRTC answer
  - `addIceCandidate()` - Exchange ICE candidates
  - `updateCallStatus()` - Update call status
  - `listenToIncomingCalls()` - Listen for incoming calls
  - `getCallHistory()` - Fetch call history

#### 3. Call Utilities (`src/utils/callUtils.js`)
- **Purpose**: Helper functions for call management
- **Features**:
  - Ringtone generation using Web Audio API
  - Browser notification support
  - Media access with error handling
  - Call duration formatting
  - Notification permission management

## 📋 Firestore Schema

```javascript
calls (collection)
   callId (auto-id)
      callerId: string (UID/email)
      receiverId: string (UID/email)
      type: "voice" | "video"
      status: "ringing" | "active" | "ended" | "rejected"
      createdAt: Timestamp
      offer: { ... } // WebRTC offer SDP
      answer: { ... } // WebRTC answer SDP
      iceCandidates: {
         caller: [ {candidateObject} ],
         receiver: [ {candidateObject} ]
      }
```

## 🎨 User Interface

### Customer Flow
1. **Start Call**: Click phone 📞 or video 🎥 icons in chat header
2. **Outgoing Call**: Shows "Calling BusinessName..." with cancel option
3. **In-Call**: Full-screen interface with floating controls
4. **End Call**: Red hang-up button ends the call

### Business Owner Flow
1. **Incoming Call**: Modal popup with caller info and Accept/Reject buttons
2. **Call Notification**: Browser notification + ringtone sound
3. **In-Call**: Same interface as customers
4. **Call Management**: Integrated with existing messaging interface

## 🎨 Design Features

### Instagram-Like UI
- **Full-screen overlay** with gradient background
- **Floating controls** at bottom center
- **Local video** picture-in-picture for video calls
- **Animated avatar** for voice calls with pulse effects
- **Smooth transitions** and hover effects
- **Responsive design** for mobile devices

### Call Controls
- **Mute/Unmute**: Toggle microphone with visual feedback
- **Camera Toggle**: Enable/disable camera for video calls
- **End Call**: Red button with confirmation
- **Call Duration**: Real-time timer display
- **Call Status**: Visual indicators for connection state

## 🔊 Audio & Notifications

### Sound Effects
- **Ringtone**: Generated using Web Audio API
- **Auto-stop**: Ringtone stops when call is answered/rejected

### Browser Notifications
- **Permission Request**: Automatic permission request
- **Call Alerts**: Show caller name and call type
- **Persistent**: Notifications require interaction

## 🚀 Implementation Status

### ✅ Completed Features
- [x] WebRTC peer-to-peer connection setup
- [x] Firebase Firestore signaling server
- [x] Voice and video call support
- [x] Instagram-like UI design
- [x] Incoming call popup for businesses
- [x] Call controls (mute, camera, end call)
- [x] Call duration tracking
- [x] Error handling for media access
- [x] Browser notifications and ringtone
- [x] Responsive mobile design
- [x] Integration with existing messaging system

### 🎯 Core Functionality Working
- **Customer to Business calls** ✅
- **Business receiving calls** ✅
- **Call state management** ✅
- **Media stream handling** ✅
- **Call termination** ✅

## 🛠️ Usage Instructions

### For Customers
1. Navigate to Messages section
2. Select a business conversation
3. Click the phone or video icon in the chat header
4. Wait for business to accept the call
5. Use controls during the call (mute, camera, end)

### For Business Owners
1. Be logged into Business Dashboard > Messages
2. Incoming calls will show popup notifications
3. Click "Accept" to answer or "Reject" to decline
4. Use the same call controls during active calls

## 🔧 Technical Requirements

### Browser Support
- **Modern browsers** with WebRTC support
- **Camera/microphone permissions** required
- **Secure context** (HTTPS) for production

### Firebase Setup
- Firestore database with `calls` collection
- Security rules allowing read/write for authenticated users
- No additional indexes required (uses basic queries)

### Environment Variables
All API keys are properly configured via environment variables:
- `VITE_FIREBASE_*` - Firebase configuration
- No additional setup needed for WebRTC (uses Google's free STUN)

## 🔒 Security Considerations

### Data Privacy
- Call documents are automatically managed
- No call content is stored in Firebase
- ICE candidates and SDP are temporarily stored for signaling only

### Access Control
- Users can only call businesses they have conversations with
- Firebase security rules enforce user authentication
- Media access requires explicit user permission

## 🚀 Future Enhancements

### Potential Improvements
- [ ] Call history interface in messages
- [ ] Call quality indicators
- [ ] Screen sharing capability
- [ ] Group calling support
- [ ] Call recording (if legally compliant)
- [ ] Push notifications for mobile apps
- [ ] Call statistics and analytics

## 🐛 Troubleshooting

### Common Issues
1. **Media Access Denied**: Users must allow camera/microphone access
2. **Network Issues**: Ensure STUN servers are accessible
3. **Firefox Compatibility**: Test cross-browser functionality
4. **Mobile Issues**: Ensure responsive design works on devices

### Debugging
- Check browser console for WebRTC connection logs
- Verify Firebase security rules allow call document access
- Test with different network configurations
- Use Chrome DevTools WebRTC internals for debugging

## 📱 Mobile Considerations

### Responsive Design
- Touch-friendly button sizes (56px minimum)
- Proper video scaling on mobile screens
- Appropriate typography sizing
- Gesture-friendly controls

### Performance
- Optimized for mobile bandwidth
- Efficient video encoding
- Battery usage considerations
- Background app handling

---

## ✅ Implementation Complete

The Voice & Video Calling MVP is now fully functional and integrated into UdhyogUnity's messaging system. The implementation follows modern WebRTC best practices and provides a professional, Instagram-like calling experience for both customers and business owners.

The system is ready for production use with proper environment variable configuration and HTTPS deployment.
