// Debug utilities for call monitoring
export const debugCall = {
    // Monitor WebRTC connection states
    monitorConnection: (peerConnection, callId) => {
        console.group(`📞 Call Debug Monitor - ${callId}`);

        peerConnection.addEventListener('connectionstatechange', () => {
            console.log(`🔗 Connection State: ${peerConnection.connectionState}`);
        });

        peerConnection.addEventListener('iceconnectionstatechange', () => {
            console.log(`🧊 ICE Connection State: ${peerConnection.iceConnectionState}`);
        });

        peerConnection.addEventListener('signalingstatechange', () => {
            console.log(`📡 Signaling State: ${peerConnection.signalingState}`);
        });

        peerConnection.addEventListener('icegatheringstatechange', () => {
            console.log(`🔍 ICE Gathering State: ${peerConnection.iceGatheringState}`);
        });

        console.groupEnd();
    },

    // Monitor media tracks
    monitorTracks: (stream, label) => {
        console.group(`🎥 ${label} Media Tracks`);

        stream.getTracks().forEach(track => {
            console.log(`${track.kind === 'video' ? '📹' : '🎤'} ${track.kind}: ${track.enabled ? 'enabled' : 'disabled'} - ${track.readyState}`);

            track.addEventListener('ended', () => {
                console.log(`❌ ${track.kind} track ended`);
            });
        });

        console.groupEnd();
    },

    // Log call timeline
    logEvent: (event, details = '') => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`⏰ ${timestamp} - ${event}${details ? `: ${details}` : ''}`);
    },

    // Performance monitoring
    monitorPerformance: () => {
        const stats = {
            startTime: performance.now(),
            events: []
        };

        return {
            log: (event) => {
                stats.events.push({
                    event,
                    timestamp: performance.now() - stats.startTime
                });
            },

            summary: () => {
                console.group('📊 Call Performance Summary');
                stats.events.forEach(({ event, timestamp }) => {
                    console.log(`${event}: ${Math.round(timestamp)}ms`);
                });
                console.groupEnd();
            }
        };
    }
};

// Network quality checker
export const checkNetworkQuality = async () => {
    try {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        if (connection) {
            console.group('🌐 Network Information');
            console.log(`Connection Type: ${connection.effectiveType}`);
            console.log(`Downlink Speed: ${connection.downlink} Mbps`);
            console.log(`RTT: ${connection.rtt}ms`);
            console.log(`Data Saver: ${connection.saveData ? 'ON' : 'OFF'}`);
            console.groupEnd();
        }

        // Simple bandwidth test
        const startTime = performance.now();
        const response = await fetch('https://httpbin.org/bytes/100000', { cache: 'no-cache' });
        const data = await response.blob();
        const endTime = performance.now();

        const duration = (endTime - startTime) / 1000;
        const speedMbps = (data.size * 8) / (duration * 1000000);

        console.log(`🚀 Estimated Speed: ${speedMbps.toFixed(2)} Mbps`);

        return {
            type: connection?.effectiveType || 'unknown',
            speed: speedMbps,
            quality: speedMbps > 5 ? 'good' : speedMbps > 1 ? 'fair' : 'poor'
        };
    } catch (error) {
        console.warn('Could not check network quality:', error);
        return { quality: 'unknown' };
    }
};

// Audio level monitoring
export const createAudioLevelMonitor = (stream) => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        microphone.connect(analyser);
        analyser.fftSize = 256;

        const monitor = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            return Math.round(average);
        };

        return {
            getLevel: monitor,
            stop: () => {
                microphone.disconnect();
                audioContext.close();
            }
        };
    } catch (error) {
        console.warn('Could not create audio level monitor:', error);
        return {
            getLevel: () => 0,
            stop: () => { }
        };
    }
};
