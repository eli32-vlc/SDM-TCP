import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { SOCKS5Proxy } from '../../core/src/socks5/proxy';
import { ReliableTransport } from '../../core/src/protocol/transport';
import { FSKModulator } from '../../core/src/audio/fsk';

let mainWindow: BrowserWindow | null = null;
let proxy: SOCKS5Proxy | null = null;
let transport: ReliableTransport | null = null;
let modulator: FSKModulator | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('start-tx-mode', async (event, config) => {
  try {
    const { port, password } = config;
    
    // Initialize components
    modulator = new FSKModulator();
    transport = new ReliableTransport(password);
    proxy = new SOCKS5Proxy({ port });

    // Handle proxy requests
    proxy.on('request', async (req: any) => {
      try {
        // Forward data through audio modem
        const data = Buffer.from(JSON.stringify({
          address: req.address,
          port: req.port,
        }));

        // Send via transport
        await transport!.sendData(data, async (packet) => {
          // Modulate and play audio
          const samples = modulator!.modulate(packet);
          mainWindow?.webContents.send('play-audio', Array.from(samples));
        });

        req.reply(true);
      } catch (err) {
        console.error('TX error:', err);
        req.reply(false);
      }
    });

    await proxy.start();
    return { success: true, message: `SOCKS5 proxy started on port ${port}` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('stop-tx-mode', async () => {
  try {
    if (proxy) {
      await proxy.stop();
      proxy = null;
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('start-rx-mode', async (event, config) => {
  try {
    const { password } = config;
    
    modulator = new FSKModulator();
    transport = new ReliableTransport(password);

    // Set up receive callback
    transport.onReceive((data) => {
      // Forward decrypted data
      mainWindow?.webContents.send('data-received', data.toString('base64'));
    });

    return { success: true, message: 'RX mode started' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('stop-rx-mode', async () => {
  try {
    transport = null;
    modulator = null;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('process-audio', async (event, samples: number[]) => {
  try {
    if (!modulator || !transport) {
      return { success: false, message: 'Not in RX mode' };
    }

    // Demodulate audio
    const audioData = new Float32Array(samples);
    const packet = modulator.demodulate(audioData);

    // Handle with transport layer
    transport.handleReceivedPacket(packet, async (ackPacket) => {
      // Send ACK via audio
      const ackSamples = modulator!.modulate(ackPacket);
      mainWindow?.webContents.send('play-audio', Array.from(ackSamples));
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});
