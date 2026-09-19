# macOS Deployment

Build from the Flutter project root:

```bash
flutter build macos --release
```

Distribute `build/macos/Build/Products/Release/printbridge_agent.app`. On first launch, allow local network access if macOS asks, then enter the backend URL and register the device. Use **Printers → Manual IP** for printers that are not advertised by mDNS.

The app needs permission to access the local network and to communicate with the printer's IPP port, normally 631.