# Linux Deployment

Build from the Flutter project root:

```bash
flutter build linux --release
```

Distribute the complete `build/linux/x64/release/bundle/` directory and launch `printbridge_agent`. Install the desktop libraries required by your distribution, allow mDNS traffic if discovery is needed, and make sure the agent can reach the backend and printer IPP port 631.