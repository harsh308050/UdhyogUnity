import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, AlertCircle } from 'react-feather';
import './CallWindow.css';
import { updateCallOffer, updateCallAnswer, addIceCandidate, updateCallStatus, listenToCall, getCall, findOrCreateCall } from '../../Firebase/callsDb';
import { getUserMedia } from '../../utils/callUtils';

const STUN_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

export default function CallWindow({ currentUser, otherUserId, type = 'video', onClose, callId: incomingCallId, otherUserName = 'Unknown User', currentUserName = null }) {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null); // Added for voice calls
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const pcRef = useRef(null);
    const callIdRef = useRef(null);
    const callStartTimeRef = useRef(null);
    const componentMountedRef = useRef(true); // Track if component is still mounted
    const [muted, setMuted] = useState(false);
    const [cameraOn, setCameraOn] = useState(type === 'video');
    const [callStatus, setCallStatus] = useState(incomingCallId ? 'connecting' : 'calling');
    const [callDuration, setCallDuration] = useState(0);
    const [isIncoming, setIsIncoming] = useState(!!incomingCallId);
    const [mediaError, setMediaError] = useState(null);
    const [connectionState, setConnectionState] = useState('new');

    useEffect(() => {
        let unsub = null;
        let durationInterval = null;
        let isInitializing = false; // Prevent duplicate initialization
        let isSetupComplete = false; // Track if setup completed successfully

        // Reset component mounted state on every effect run (for StrictMode)
        componentMountedRef.current = true;

        const setupPeerConnection = () => {
            const pc = new RTCPeerConnection(STUN_CONFIG);

            pc.onicecandidate = (event) => {
                console.log('🧊 ICE candidate generated:', event.candidate?.type || 'end-of-candidates');
                if (event.candidate && callIdRef.current) {
                    const role = isIncoming ? 'receiver' : 'caller';
                    addIceCandidate(callIdRef.current, role, event.candidate.toJSON())
                        .catch(err => console.error(`addIceCandidate(${role}) failed:`, err));
                }
            };

            pc.ontrack = (event) => {
                console.log('📺 Remote track received:', event.track.kind);
                const [stream] = event.streams;
                remoteStreamRef.current = stream;

                // Handle video track
                if (event.track.kind === 'video' && remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = stream;
                    console.log('📺 Remote video element updated');
                }

                // Handle audio track - critical for voice calls
                if (event.track.kind === 'audio') {
                    event.track.enabled = true;
                    console.log('🔊 Remote audio track enabled');

                    // For voice calls or when video element is not available, use audio element
                    if (type === 'voice' || !remoteVideoRef.current) {
                        if (remoteAudioRef.current) {
                            remoteAudioRef.current.srcObject = stream;
                            remoteAudioRef.current.volume = 1.0;
                            remoteAudioRef.current.muted = false;
                            remoteAudioRef.current.play()
                                .then(() => console.log('🔊 Audio playback started'))
                                .catch(e => console.warn('Audio auto-play failed:', e));
                        }
                    } else {
                        // For video calls, ensure video element handles audio too
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = stream;
                            remoteVideoRef.current.volume = 1.0;
                            remoteVideoRef.current.muted = false;
                        }
                    }
                }

                // Start call timer when first track is received
                if (!callStartTimeRef.current) {
                    callStartTimeRef.current = Date.now();
                    setCallStatus('connected');
                    console.log('⏱️ Call timer started');

                    durationInterval = setInterval(() => {
                        const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
                        setCallDuration(elapsed);
                    }, 1000);
                }
            };

            pc.onconnectionstatechange = () => {
                console.log('🔗 Connection state changed:', pc.connectionState);
                setConnectionState(pc.connectionState);

                if (pc.connectionState === 'connected') {
                    setCallStatus('connected');
                    console.log('✅ Peer connection established');
                } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    setCallStatus('disconnected');
                    console.log('❌ Peer connection lost');
                } else if (pc.connectionState === 'connecting') {
                    setCallStatus('connecting');
                    console.log('🔄 Peer connection connecting...');
                }
            };

            pc.oniceconnectionstatechange = () => {
                console.log('🧊 ICE connection state:', pc.iceConnectionState);

                if (pc.iceConnectionState === 'failed') {
                    console.error('❌ ICE connection failed');
                    setCallStatus('failed');
                }
            };

            pc.onsignalingstatechange = () => {
                console.log('📡 Signaling state changed:', pc.signalingState);
            };

            return pc;
        };

        const setupLocalMedia = async () => {
            try {
                const constraints = {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        // Higher quality audio for voice calls
                        sampleRate: type === 'voice' ? 48000 : 44100,
                        channelCount: 1, // Mono for better compression
                        volume: 1.0
                    },
                    video: type === 'video' ? {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 }
                    } : false
                };

                console.log('🎤 Requesting media with constraints:', constraints);
                const { stream, error } = await getUserMedia(constraints);

                if (error) {
                    setMediaError(error);
                    setCallStatus('failed');
                    return null;
                }

                localStreamRef.current = stream;

                // Set up local video/audio display
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.muted = true; // Prevent echo
                }

                // Log track info for debugging
                stream.getTracks().forEach(track => {
                    console.log(`📺 Local ${track.kind} track:`, {
                        enabled: track.enabled,
                        readyState: track.readyState,
                        settings: track.getSettings?.()
                    });
                });

                return stream;
            } catch (err) {
                console.error('Failed to setup local media:', err);
                setMediaError('Failed to access camera/microphone');
                setCallStatus('failed');
                return null;
            }
        };

        const setupCaller = async () => {
            try {
                // Prevent duplicate setup if already in progress
                if (callIdRef.current && pcRef.current && pcRef.current.signalingState !== 'closed') {
                    console.log('⚠️ Call setup already working, skipping duplicate');
                    return;
                }

                console.log('🔄 Setting up caller');

                // Setup peer connection first
                pcRef.current = setupPeerConnection();
                if (!pcRef.current) {
                    throw new Error('Failed to create peer connection');
                }

                const localStream = await setupLocalMedia();
                if (!localStream) {
                    throw new Error('Failed to get local media stream');
                }

                // Check if peer connection was closed during async media setup
                if (!pcRef.current || pcRef.current.signalingState === 'closed') {
                    console.warn('⚠️ Peer connection was closed during media setup, aborting');
                    throw new Error('Peer connection was closed during setup - likely due to component cleanup');
                }

                // Only check component mount state if we're not in development mode (StrictMode causes issues)
                if (!componentMountedRef.current && process.env.NODE_ENV === 'production') {
                    console.warn('⚠️ Component unmounted during setup, aborting');
                    throw new Error('Component was unmounted during setup');
                }

                // Verify peer connection is still valid before adding tracks
                if (!pcRef.current) {
                    throw new Error('Peer connection became null after media setup');
                }

                // Add tracks to peer connection
                localStream.getTracks().forEach(track => {
                    console.log('Adding local track:', track.kind);
                    try {
                        pcRef.current.addTrack(track, localStream);
                    } catch (error) {
                        console.error('Failed to add track:', error);
                        throw new Error(`Failed to add ${track.kind} track: ${error.message}`);
                    }
                });

                // Find or create call document (prevents duplicates)
                console.log('📞 Finding or creating call doc for', { caller: currentUser.email || currentUser.uid, receiver: otherUserId, type });
                const { id, existed } = await findOrCreateCall({
                    callerId: currentUser.email || currentUser.uid,
                    receiverId: otherUserId,
                    type,
                    callerName: currentUserName || currentUser.email || currentUser.uid,
                    receiverName: otherUserName
                });
                callIdRef.current = id;

                if (existed) {
                    console.log('📄 Using existing call doc with id:', id);
                } else {
                    console.log('📄 Created new call doc with id:', id);
                }

                // Create and set offer
                const offer = await pcRef.current.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: type === 'video'
                });
                await pcRef.current.setLocalDescription(offer);
                await updateCallOffer(id, offer);

                // Listen for answer and ICE candidates
                unsub = listenToCall(id, async (callDoc) => {
                    try {
                        console.log('📡 Caller received update, signaling state:', pcRef.current.signalingState);

                        if (callDoc.answer && !pcRef.current.currentRemoteDescription) {
                            console.log('📥 Received answer, setting remote description');
                            console.log('🔍 Current signaling state:', pcRef.current.signalingState);

                            if (pcRef.current.signalingState === 'have-local-offer') {
                                await pcRef.current.setRemoteDescription(new RTCSessionDescription(callDoc.answer));
                                console.log('✅ Remote description set, new state:', pcRef.current.signalingState);
                            } else {
                                console.warn('⚠️ Cannot set remote description, wrong state:', pcRef.current.signalingState);
                            }
                        }

                        // Process ICE candidates only after remote description is set
                        if (callDoc.iceCandidates?.receiver && pcRef.current.remoteDescription) {
                            console.log('🧊 Processing receiver ICE candidates:', callDoc.iceCandidates.receiver.length);
                            for (const candidate of callDoc.iceCandidates.receiver) {
                                try {
                                    if (pcRef.current.signalingState !== 'closed') {
                                        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                                    }
                                } catch (e) {
                                    console.warn('Failed to add ICE candidate:', e);
                                }
                            }
                        }

                        if (callDoc.status === 'ended' || callDoc.status === 'rejected') {
                            cleanup();
                            onClose && onClose(callDoc.status);
                        }
                    } catch (e) {
                        console.error('Error in caller listener:', e);
                    }
                });

            } catch (err) {
                console.error('Setup caller failed:', err);
                setCallStatus('failed');
                onClose && onClose('error');
            }
        };

        const setupReceiver = async (callId) => {
            try {
                // Prevent duplicate setup if already in progress
                if (pcRef.current && pcRef.current.signalingState !== 'closed') {
                    console.log('⚠️ Receiver setup already working, skipping duplicate');
                    return;
                }

                console.log('🔄 Setting up receiver for call:', callId);

                // Setup peer connection first
                pcRef.current = setupPeerConnection();
                if (!pcRef.current) {
                    throw new Error('Failed to create peer connection');
                }

                callIdRef.current = callId;
                console.log('🔍 Initial signaling state:', pcRef.current.signalingState);

                const localStream = await setupLocalMedia();
                if (!localStream) {
                    throw new Error('Failed to get local media stream');
                }

                // Check if peer connection was closed during async media setup
                if (!pcRef.current || pcRef.current.signalingState === 'closed') {
                    console.warn('⚠️ Peer connection was closed during media setup, aborting');
                    throw new Error('Peer connection was closed during setup - likely due to component cleanup');
                }

                // Only check component mount state if we're not in development mode (StrictMode causes issues)
                if (!componentMountedRef.current && process.env.NODE_ENV === 'production') {
                    console.warn('⚠️ Component unmounted during setup, aborting');
                    throw new Error('Component was unmounted during setup');
                }

                // Verify peer connection is still valid before adding tracks
                if (!pcRef.current) {
                    throw new Error('Peer connection became null after media setup');
                }

                // Add tracks to peer connection
                localStream.getTracks().forEach(track => {
                    console.log('Adding local track (receiver):', track.kind);
                    try {
                        pcRef.current.addTrack(track, localStream);
                    } catch (error) {
                        console.error('Failed to add track:', error);
                        throw new Error(`Failed to add ${track.kind} track: ${error.message}`);
                    }
                });

                // Get call document with offer
                const callDoc = await getCall(callId);
                if (!callDoc || !callDoc.offer) {
                    throw new Error('No offer found in call document');
                }

                console.log('📥 Got offer, signaling state:', pcRef.current?.signalingState);

                // Verify peer connection is still valid
                if (!pcRef.current) {
                    throw new Error('Peer connection became null during setup');
                }

                // Check if we can set remote description
                if (pcRef.current.signalingState === 'stable') {
                    console.log('🔄 Setting remote description (offer)');
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(callDoc.offer));
                    console.log('✅ Remote description set, new state:', pcRef.current.signalingState);

                    // Only create answer if we're in the right state
                    if (pcRef.current.signalingState === 'have-remote-offer') {
                        console.log('📝 Creating answer');
                        const answer = await pcRef.current.createAnswer();
                        console.log('📤 Setting local description (answer)');
                        await pcRef.current.setLocalDescription(answer);
                        console.log('✅ Local description set, new state:', pcRef.current.signalingState);

                        await updateCallAnswer(callId, answer);
                        console.log('📤 Answer sent to Firebase');
                        setCallStatus('connected');
                    } else {
                        console.warn('⚠️ Wrong signaling state for creating answer:', pcRef.current.signalingState);
                        throw new Error(`Wrong signaling state for creating answer: ${pcRef.current.signalingState}`);
                    }
                } else {
                    console.warn('⚠️ Cannot set remote description, wrong state:', pcRef.current.signalingState);
                    throw new Error(`Cannot set remote description, wrong state: ${pcRef.current.signalingState}`);
                }

                // Process existing ICE candidates
                if (callDoc.iceCandidates?.caller && pcRef.current) {
                    console.log('🧊 Processing existing ICE candidates:', callDoc.iceCandidates.caller.length);
                    for (const candidate of callDoc.iceCandidates.caller) {
                        try {
                            if (pcRef.current && pcRef.current.remoteDescription) {
                                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                                console.log('✅ Added existing ICE candidate');
                            } else {
                                console.warn('⚠️ Cannot add ICE candidate - no remote description yet');
                            }
                        } catch (e) {
                            console.warn('Failed to add existing ICE candidate:', e);
                        }
                    }
                }

                // Listen for more ICE candidates
                if (pcRef.current) {
                    unsub = listenToCall(callId, async (updated) => {
                        try {
                            if (!pcRef.current) {
                                console.warn('⚠️ Peer connection is null in receiver listener');
                                return;
                            }

                            if (updated.iceCandidates?.caller) {
                                const newCandidates = updated.iceCandidates.caller;
                                if (newCandidates.length > (callDoc.iceCandidates?.caller?.length || 0)) {
                                    console.log('🧊 Processing new ICE candidates');
                                    for (const candidate of newCandidates) {
                                        try {
                                            if (pcRef.current && pcRef.current.signalingState !== 'closed' && pcRef.current.remoteDescription) {
                                                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                                            }
                                        } catch (e) {
                                            console.warn('Failed to add new ICE candidate:', e);
                                        }
                                    }
                                }
                            }

                            if (updated.status === 'ended') {
                                cleanup();
                                onClose && onClose('ended');
                            }
                        } catch (e) {
                            console.error('Error in receiver listener:', e);
                        }
                    });
                } else {
                    console.warn('⚠️ Peer connection is null, cannot listen for call updates');
                }

            } catch (err) {
                console.error('Setup receiver failed:', err);
                setCallStatus('failed');
                onClose && onClose('error');
            }
        };

        // Initialize call setup
        (async () => {
            try {
                // In React StrictMode, effects run twice. Check if we already have a working setup
                if (callIdRef.current && pcRef.current && pcRef.current.signalingState !== 'closed') {
                    console.log('⚠️ Call already set up and working, skipping duplicate');
                    isSetupComplete = true;
                    return;
                }

                // Prevent duplicate initialization within the same effect run
                if (isInitializing) {
                    console.log('⚠️ Call initialization already in progress, skipping');
                    return;
                }

                isInitializing = true;
                console.log('🚀 Starting call initialization');

                if (incomingCallId) {
                    callIdRef.current = incomingCallId;
                    await setupReceiver(incomingCallId);
                } else {
                    await setupCaller();
                }

                isSetupComplete = true;
                console.log('✅ Call setup completed successfully');
            } catch (err) {
                console.error('Call setup failed:', err);

                // Only set failed status if component is still mounted
                if (componentMountedRef.current) {
                    setCallStatus('failed');
                    onClose && onClose('error');
                }
            } finally {
                isInitializing = false;
            }
        })();

        return () => {
            console.log('🧹 CallWindow cleanup triggered, setup complete:', isSetupComplete, 'initializing:', isInitializing);
            componentMountedRef.current = false; // Mark component as unmounted

            // In StrictMode, React calls cleanup immediately after mount, then re-mounts
            // Only do full cleanup if we're actually unmounting or setup completed
            if (isSetupComplete && !isInitializing) {
                console.log('✅ Performing full cleanup - setup was complete');
                if (unsub) unsub();
                if (durationInterval) clearInterval(durationInterval);
                cleanup();
            } else if (isInitializing) {
                console.log('⚠️ Skipping cleanup during initialization');
                // Just clear intervals and unsubscribe, but don't close peer connection
                if (unsub) unsub();
                if (durationInterval) clearInterval(durationInterval);
            } else {
                console.log('🔄 Minimal cleanup - setup not complete');
                // Minimal cleanup for StrictMode double-mount
                if (unsub) unsub();
                if (durationInterval) clearInterval(durationInterval);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanup = () => {
        try {
            // Stop local stream tracks
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    track.stop();
                    console.log('Stopped local track:', track.kind);
                });
                localStreamRef.current = null;
            }

            // Stop remote stream tracks
            if (remoteStreamRef.current) {
                remoteStreamRef.current.getTracks().forEach(track => {
                    track.stop();
                });
                remoteStreamRef.current = null;
            }

            // Clear video/audio elements
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = null;
            }

            // Close peer connection
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
                console.log('Peer connection closed');
            }

            // Reset call timer
            callStartTimeRef.current = null;
        } catch (e) {
            console.warn('Error during cleanup:', e);
        }
    };

    const handleMute = () => {
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = muted; // Toggle enabled state
            });
            setMuted(!muted);
            console.log('Audio', muted ? 'unmuted' : 'muted');
        }
    };

    const handleToggleCamera = () => {
        if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !cameraOn; // Toggle enabled state
            });
            setCameraOn(!cameraOn);
            console.log('Camera', cameraOn ? 'off' : 'on');
        }
    };

    const handleEndCall = async () => {
        console.log('Ending call', callIdRef.current);
        if (callIdRef.current) await updateCallStatus(callIdRef.current, 'ended');
        cleanup();
        onClose && onClose('ended');
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getCallStatusText = () => {
        switch (callStatus) {
            case 'calling': return `Calling ${otherUserName}...`;
            case 'connecting': return 'Connecting...';
            case 'connected': return formatDuration(callDuration);
            case 'disconnected': return 'Call ended';
            case 'failed': return 'Call failed';
            default: return 'Unknown status';
        }
    };

    return (
        <div className="call-window-overlay">
            {/* Hidden audio element for voice calls */}
            <audio
                ref={remoteAudioRef}
                autoPlay
                playsInline
                style={{ display: 'none' }}
            />

            <div className="call-window">
                {/* Call Status Header */}
                <div className="call-header">
                    <h3>{otherUserName}</h3>
                    <p className="call-status">{getCallStatusText()}</p>
                </div>

                {type === 'video' ? (
                    <div className="video-container">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="remote-video"
                            style={{ display: callStatus === 'connected' ? 'block' : 'none' }}
                        />
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="local-video"
                        />
                        {callStatus !== 'connected' && (
                            <div className="video-placeholder">
                                <div className="avatar-circle">
                                    <User size={80} />
                                </div>
                                <h2>{otherUserName}</h2>
                                <p className="call-type">Video Call</p>
                                {callStatus === 'calling' && (
                                    <div className="calling-animation">
                                        <div className="pulse"></div>
                                        <div className="pulse"></div>
                                        <div className="pulse"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="voice-call-container">
                        {mediaError ? (
                            <div className="media-error">
                                <AlertCircle size={60} />
                                <h3>Media Access Error</h3>
                                <p>{mediaError}</p>
                                <button onClick={handleEndCall} className="retry-btn">
                                    Close Call
                                </button>
                            </div>
                        ) : (
                            <div className="voice-call-avatar">
                                <div className="avatar-circle">
                                    <User size={80} />
                                </div>
                                <h2>{otherUserName}</h2>
                                <p className="call-type">Voice Call</p>
                                {callStatus === 'calling' && (
                                    <div className="calling-animation">
                                        <div className="pulse"></div>
                                        <div className="pulse"></div>
                                        <div className="pulse"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="call-controls">
                    <button
                        onClick={handleMute}
                        className={`control-btn ${muted ? 'muted' : ''}`}
                        title={muted ? 'Unmute' : 'Mute'}
                    >
                        {muted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    {type === 'video' && (
                        <button
                            onClick={handleToggleCamera}
                            className={`control-btn ${!cameraOn ? 'disabled' : ''}`}
                            title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
                        >
                            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>
                    )}

                    <button
                        onClick={handleEndCall}
                        className="control-btn end-call"
                        title="End call"
                    >
                        <PhoneOff size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
