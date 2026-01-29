import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Stack,
  Card,
  CardContent,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  RadioButtonChecked,
  Send,
  Stop,
  Settings,
  SignalCellularAlt,
} from '@mui/icons-material';

declare global {
  interface Window {
    electronAPI: {
      startTxMode: (config: { port: number; password: string }) => Promise<any>;
      stopTxMode: () => Promise<any>;
      startRxMode: (config: { password: string }) => Promise<any>;
      stopRxMode: () => Promise<any>;
      processAudio: (samples: number[]) => Promise<any>;
      onPlayAudio: (callback: (samples: number[]) => void) => void;
      onDataReceived: (callback: (data: string) => void) => void;
    };
  }
}

type Mode = 'tx' | 'rx' | null;

export default function App() {
  const [mode, setMode] = useState<Mode>(null);
  const [isActive, setIsActive] = useState(false);
  const [port, setPort] = useState('1080');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [dataRate, setDataRate] = useState(0);
  const [packetsReceived, setPacketsReceived] = useState(0);
  const [packetsSent, setPacketsSent] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Set up audio context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Listen for audio playback
    window.electronAPI.onPlayAudio((samples: number[]) => {
      playAudioSamples(samples);
    });

    // Listen for received data
    window.electronAPI.onDataReceived((data: string) => {
      setPacketsReceived(prev => prev + 1);
      console.log('Data received:', data);
    });

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const playAudioSamples = async (samples: number[]) => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const audioBuffer = audioContext.createBuffer(1, samples.length, 48000);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < samples.length; i++) {
      channelData[i] = samples[i];
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
    
    setPacketsSent(prev => prev + 1);
  };

  const handleModeChange = (event: React.MouseEvent<HTMLElement>, newMode: Mode) => {
    if (isActive) return;
    setMode(newMode);
  };

  const handleStart = async () => {
    if (!mode || !password) {
      setStatus({ type: 'error', message: 'Please select mode and enter password' });
      return;
    }

    try {
      if (mode === 'tx') {
        const result = await window.electronAPI.startTxMode({
          port: parseInt(port),
          password,
        });
        
        if (result.success) {
          setIsActive(true);
          setStatus({ type: 'success', message: result.message });
        } else {
          setStatus({ type: 'error', message: result.message });
        }
      } else {
        // RX mode - start audio capture
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        if (!audioContextRef.current) return;
        const audioContext = audioContextRef.current;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;
        source.connect(analyser);

        // Start processing audio
        const result = await window.electronAPI.startRxMode({ password });
        
        if (result.success) {
          setIsActive(true);
          setStatus({ type: 'success', message: result.message });
          startAudioProcessing();
        } else {
          stream.getTracks().forEach(track => track.stop());
          setStatus({ type: 'error', message: result.message });
        }
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const handleStop = async () => {
    try {
      if (mode === 'tx') {
        await window.electronAPI.stopTxMode();
      } else {
        await window.electronAPI.stopRxMode();
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
      }
      
      setIsActive(false);
      setStatus({ type: 'info', message: 'Stopped' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const startAudioProcessing = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const process = () => {
      if (!isActive || !analyserRef.current) return;

      analyserRef.current.getFloatTimeDomainData(dataArray);
      
      // Process audio samples
      window.electronAPI.processAudio(Array.from(dataArray));

      setTimeout(process, 100);
    };

    process();
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SignalCellularAlt sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            SDM-TCP Modem
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Software Defined Modem with AES-256 encryption, ACKs, and VOIP support
        </Typography>

        {status && (
          <Alert severity={status.type} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
            {status.message}
          </Alert>
        )}

        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Mode
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              fullWidth
              disabled={isActive}
            >
              <ToggleButton value="tx">
                <Send sx={{ mr: 1 }} />
                TX Mode (Transmit)
              </ToggleButton>
              <ToggleButton value="rx">
                <RadioButtonChecked sx={{ mr: 1 }} />
                RX Mode (Receive)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isActive}
            fullWidth
            required
          />

          {mode === 'tx' && (
            <TextField
              label="SOCKS5 Port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isActive}
              fullWidth
            />
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            {!isActive ? (
              <Button
                variant="contained"
                onClick={handleStart}
                disabled={!mode || !password}
                fullWidth
                size="large"
              >
                Start {mode?.toUpperCase()}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                onClick={handleStop}
                startIcon={<Stop />}
                fullWidth
                size="large"
              >
                Stop
              </Button>
            )}
          </Box>

          {isActive && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Statistics
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Status</Typography>
                      <Chip
                        label="Active"
                        color="success"
                        size="small"
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Packets Sent</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {packetsSent}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Packets Received</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {packetsReceived}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
        Bit Rate: 1200 bps | Encryption: AES-256-GCM | Protocol: FSK
      </Typography>
    </Container>
  );
}
