import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  startTxMode: (config: { port: number; password: string }) =>
    ipcRenderer.invoke('start-tx-mode', config),
  stopTxMode: () => ipcRenderer.invoke('stop-tx-mode'),
  startRxMode: (config: { password: string }) =>
    ipcRenderer.invoke('start-rx-mode', config),
  stopRxMode: () => ipcRenderer.invoke('stop-rx-mode'),
  startBidirectionalMode: (config: { port: number; password: string }) =>
    ipcRenderer.invoke('start-bidirectional-mode', config),
  stopBidirectionalMode: () => ipcRenderer.invoke('stop-bidirectional-mode'),
  processAudio: (samples: number[]) => ipcRenderer.invoke('process-audio', samples),
  processAudioBidirectional: (samples: number[]) => 
    ipcRenderer.invoke('process-audio-bidirectional', samples),
  onPlayAudio: (callback: (samples: number[]) => void) => {
    ipcRenderer.on('play-audio', (event, samples) => callback(samples));
  },
  onDataReceived: (callback: (data: string) => void) => {
    ipcRenderer.on('data-received', (event, data) => callback(data));
  },
});
