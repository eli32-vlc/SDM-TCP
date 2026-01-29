# Android Application

The Android application for SDM-TCP modem is built using React Native to share code with the macOS/desktop application.

## Setup

This is a simplified structure. For a production build, you would need:

1. **Install Dependencies**:
```bash
npm install
```

2. **Android Studio**: Open the `android` folder in Android Studio

3. **Build**:
```bash
npm run android
```

## Features

- RX Mode: Receive audio through microphone
- TX Mode: Transmit through speaker with SOCKS5 proxy
- Material UI interface
- AES-256 encryption
- ACKs and retries

## Structure

```
android/
├── app/
│   └── src/
│       └── main/
│           ├── java/           # Native Android code
│           ├── res/            # Resources
│           └── AndroidManifest.xml
└── package.json
```

## Note

The desktop (macOS/Electron) version is more feature-complete and recommended for initial testing. The Android version would require additional native modules for audio processing which are beyond the scope of this initial implementation.

For Android support, consider using:
- React Native Audio for audio capture/playback
- Native Kotlin modules for DSP operations
- Gradle build system for packaging
