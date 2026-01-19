# HLS.js Audio Stream Player

This is a vanilla JavaScript project that plays an audio stream using the hls.js library and displays all metadata received from the stream.

## Features
- Plays HLS audio stream (default: ZET Dance)
- Displays all metadata events received from hls.js
- Simple, modern UI

## How to Use
1. Open `index.html` in your browser (use a local server for best results).
2. The player will automatically load the test stream and display metadata as it is received.

## Test Stream
- Default: https://28553.live.streamtheworld.com/ZET_DANCE.mp3?dist=eztestbanera

## Requirements
- Modern browser (Chrome, Firefox, Edge, Safari)
- Internet connection to load hls.js from CDN

## Customization
- To use a different stream, change the `streamUrl` variable in `main.js`.

---

This project uses [hls.js](https://hlsjs.video-dev.org/) via CDN.
