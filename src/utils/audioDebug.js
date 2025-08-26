// Audio debugging utilities for call testing

export const testAudioDevices = async () => {
    try {
        console.group('🔊 Audio Device Test');

        // Get available audio devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

        console.log('🎤 Audio Input Devices:', audioInputs.map(d => ({
            deviceId: d.deviceId,
            label: d.label || 'Unknown Device'
        })));

        console.log('🔊 Audio Output Devices:', audioOutputs.map(d => ({
            deviceId: d.deviceId,
            label: d.label || 'Unknown Device'
        })));

        // Test microphone access
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                const track = audioTracks[0];
                console.log('✅ Microphone Test Passed:', {
                    label: track.label,
                    enabled: track.enabled,
                    readyState: track.readyState,
                    settings: track.getSettings?.()
                });

                // Stop the test stream
                stream.getTracks().forEach(track => track.stop());
            }
        } catch (error) {
            console.error('❌ Microphone Test Failed:', error);
        }

        console.groupEnd();

        return {
            audioInputs: audioInputs.length,
            audioOutputs: audioOutputs.length,
            microphoneAccess: true
        };

    } catch (error) {
        console.error('Audio device enumeration failed:', error);
        return {
            audioInputs: 0,
            audioOutputs: 0,
            microphoneAccess: false
        };
    }
};

export const testAudioPlayback = () => {
    return new Promise((resolve) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);

            oscillator.onended = () => {
                console.log('✅ Audio Playback Test Completed');
                audioContext.close();
                resolve(true);
            };

            console.log('🔊 Playing test tone (440Hz for 1 second)...');

        } catch (error) {
            console.error('❌ Audio Playback Test Failed:', error);
            resolve(false);
        }
    });
};

export const monitorAudioLevel = (stream, duration = 5000) => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        microphone.connect(analyser);
        analyser.fftSize = 256;

        console.log('🎤 Monitoring audio levels for', duration / 1000, 'seconds...');

        const startTime = Date.now();
        const levels = [];

        const checkLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const level = Math.round(average);
            levels.push(level);

            if (Date.now() - startTime < duration) {
                setTimeout(checkLevel, 100);
            } else {
                const maxLevel = Math.max(...levels);
                const avgLevel = Math.round(levels.reduce((sum, l) => sum + l, 0) / levels.length);

                console.log('📊 Audio Level Results:', {
                    maxLevel,
                    avgLevel,
                    samples: levels.length,
                    status: avgLevel > 5 ? 'GOOD' : avgLevel > 1 ? 'WEAK' : 'NO SIGNAL'
                });

                microphone.disconnect();
                audioContext.close();
            }
        };

        checkLevel();

    } catch (error) {
        console.error('Audio level monitoring failed:', error);
    }
};

// Quick audio diagnostic
export const runAudioDiagnostic = async () => {
    console.group('🔍 Complete Audio Diagnostic');

    // Test 1: Device enumeration
    const devices = await testAudioDevices();

    // Test 2: Audio playback
    const playbackWorks = await testAudioPlayback();

    // Test 3: Microphone level monitoring
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        monitorAudioLevel(stream, 3000);

        // Clean up after monitoring
        setTimeout(() => {
            stream.getTracks().forEach(track => track.stop());
        }, 3000);

    } catch (error) {
        console.error('Could not test microphone levels:', error);
    }

    console.log('🏁 Diagnostic Summary:', {
        audioInputDevices: devices.audioInputs,
        audioOutputDevices: devices.audioOutputs,
        playbackWorks,
        microphoneAccess: devices.microphoneAccess
    });

    console.groupEnd();
};

// WebRTC audio stats
export const getAudioStats = async (peerConnection) => {
    try {
        const stats = await peerConnection.getStats();
        const audioStats = [];

        stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
                audioStats.push({
                    type: 'inbound-audio',
                    packetsReceived: report.packetsReceived,
                    packetsLost: report.packetsLost,
                    bytesReceived: report.bytesReceived,
                    jitter: report.jitter
                });
            } else if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
                audioStats.push({
                    type: 'outbound-audio',
                    packetsSent: report.packetsSent,
                    bytesSent: report.bytesSent,
                    retransmittedPacketsSent: report.retransmittedPacketsSent
                });
            }
        });

        console.log('📊 WebRTC Audio Stats:', audioStats);
        return audioStats;

    } catch (error) {
        console.error('Failed to get audio stats:', error);
        return [];
    }
};
