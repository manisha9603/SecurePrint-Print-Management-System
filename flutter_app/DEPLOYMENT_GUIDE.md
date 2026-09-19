# PrintBridge Desktop Deployment

## Requirements

- Windows 10 or newer, macOS 12 or newer, or a supported Linux desktop.
- Network access to the PrintBridge backend.
- On Windows, the Visual C++ runtime and .NET Desktop Runtime may be required by the host machine.
- A network printer reachable from the agent, using IPP on port 631.

## Windows

The release executable is `build/windows/x64/runner/Release/flutter_app.exe`.

Run it directly or distribute the complete `Release` directory, not only the executable, because Flutter native DLLs and asset files are required beside it.

On first launch, enter the backend URL, for example `https://printbridge-app.herokuapp.com` or `http://192.168.1.20:3001`, and choose a device name. The app registers the workstation and stores its API key in secure storage.

Open **Printers**, choose **Manual IP**, enter the printer address, and confirm the IPP connection. An IPP printer normally uses port 631.

## macOS and Linux

Build with the platform commands below and distribute the generated application bundle together with its adjacent files:

```bash
flutter build macos --release
flutter build linux --release
```

macOS output: `build/macos/Build/Products/Release/printbridge_agent.app`

Linux output: `build/linux/x64/release/bundle/printbridge_agent`

## Troubleshooting

- **Cannot connect:** Confirm the URL is reachable and includes the correct port. For HTTPS deployments, use `https://` and ensure WebSockets are allowed.
- **Printer not found:** Confirm the printer supports IPP, port 631 is reachable, and add it manually by IP.
- **Jobs remain queued:** Check the Logs screen, printer status, and that the selected printer has an IP address.
- **Windows startup failure:** Install the current Visual C++ Redistributable and rerun the release executable from its complete Release directory.
- **Repeated registration:** Clear the app's secure-storage credentials through Settings, then register again.