// Utility functions for call handling

// Create a notification sound using Web Audio API
export const playRingtone = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1);

        return oscillator;
    } catch (error) {
        console.warn('Could not play ringtone:', error);
        return null;
    }
};

// Stop ringtone
export const stopRingtone = (oscillator) => {
    try {
        if (oscillator) {
            oscillator.stop();
        }
    } catch (error) {
        console.warn('Could not stop ringtone:', error);
    }
};

// Request notification permission
export const requestNotificationPermission = async () => {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
};

// Show browser notification for incoming call
export const showCallNotification = (callerName, callType) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`Incoming ${callType} call`, {
            body: `${callerName} is calling you`,
            icon: '/favicon.ico',
            tag: 'incoming-call',
            requireInteraction: true
        });

        return notification;
    }
    return null;
};

// Format call duration
export const formatCallDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Get user media with error handling
export const getUserMedia = async (constraints = { audio: true, video: true }) => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return { stream, error: null };
    } catch (error) {
        console.error('Error accessing media devices:', error);

        let errorMessage = 'Could not access camera/microphone';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera/microphone access denied. Please allow access and try again.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera/microphone found. Please check your devices.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Camera/microphone is being used by another application.';
        }

        return { stream: null, error: errorMessage };
    }
};
