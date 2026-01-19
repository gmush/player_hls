# HLS + FLV Audio Stream Player

This is a vanilla JavaScript project that plays audio streams using **hls.js** and **flv.js** and displays metadata received from the stream.

## Features
- Plays HLS and FLV audio streams (default: ZET Dance MP3)
- Displays HLS metadata events from hls.js
- Displays FLV script data (cue points, listener info, metadata)
- Separate FLV Media Info panel for large JSON payloads
- Example stream selector and custom URL input
- Simple, modern UI

## How to Use
1. Open `index.html` in your browser (use a local server for best results).
2. The player will automatically load the test stream and display metadata as it is received.

## Test Streams
- Default (MP3): https://28553.live.streamtheworld.com/ZET_DANCE.mp3?dist=eztestbanera
- FLV (no extension): https://28553.live.streamtheworld.com/ZET_DANCE
- HLS examples are available in the dropdown in the UI

## Requirements
- Modern browser (Chrome, Firefox, Edge, Safari)
- Internet connection to load hls.js and flv.js from CDN

## Notes
- The native TextTrack API is disabled automatically for FLV streams.
- Extensionless URLs are treated as FLV when flv.js is supported.

## Customization
- To use a different stream, change the `streamUrl` variable in `main.js` or use the URL input.

---

This project uses [hls.js](https://hlsjs.video-dev.org/) and [flv.js](https://github.com/bilibili/flv.js) via CDN.
