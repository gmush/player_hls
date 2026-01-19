// main.js - HLS.js Audio Player with Metadata Display

const audio = document.getElementById('audio');
const metadataPre = document.getElementById('metadata');
const flvMediaInfoPre = document.getElementById('flv-media-info');
const defaultStreamUrl = 'https://28553.live.streamtheworld.com/ZET_DANCE.mp3?dist=eztestbanera';
const useTextTrackCheckbox = document.getElementById('use-texttrack');
const streamUrlInput = document.getElementById('stream-url');
const loadStreamButton = document.getElementById('load-stream');
const exampleStreamsSelect = document.getElementById('example-streams');

function isHlsUrl(url) {
  return /\.m3u8(\?|#|$)/i.test(url);
}

function isFlvUrl(url) {
  return /\.flv(\?|#|$)/i.test(url);
}

function isExtensionlessUrl(url) {
  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split('/').filter(Boolean).pop() || '';
    return !/\.[a-z0-9]+$/i.test(lastSegment);
  } catch {
    return false;
  }
}

let hlsActive = false;
let flvActive = false;

function displayMetadata(data, allowWhenHlsActive = false, allowWhenFlvActive = false) {
  if (hlsActive && !allowWhenHlsActive) {
    return;
  }
  if (flvActive && !allowWhenFlvActive) {
    return;
  }
  // Pretty print all metadata as JSON
  metadataPre.textContent = JSON.stringify(data, null, 2);
}

function appendMetadataLine(text) {
  if (!metadataPre) {
    return;
  }
  const prefix = metadataPre.textContent ? `${metadataPre.textContent}
` : '';
  metadataPre.textContent = `${prefix}${text}`;
}

function displayFlvMediaInfo(info) {
  if (!flvMediaInfoPre) {
    return;
  }
  flvMediaInfoPre.textContent = JSON.stringify(info, null, 2);
}

function displayAudioState(event, extra = {}) {
  displayMetadata({
    event,
    currentTime: audio.currentTime,
    duration: audio.duration,
    paused: audio.paused,
    ended: audio.ended,
    readyState: audio.readyState,
    networkState: audio.networkState,
    ...extra
  });
}

function attachFlvEventLogging(player) {
  if (!window.flvjs || !flvjs.Events) {
    return;
  }

  const eventNames = Object.values(flvjs.Events);
  eventNames.forEach((eventName) => {
    player.on(eventName, (...args) => {
      console.log('[flv.js]', eventName, ...args);
    });
  });
}

let hls = null;
let flvPlayer = null;
let audioEventsBound = false;
const audioEventHandlers = new Map();

let textTrackEnabled = false;
const textTrackListeners = new Map();
let trackListAddHandler = null;
let trackListRemoveHandler = null;

function trackInfo(track) {
  return {
    id: track.id || null,
    kind: track.kind || null,
    label: track.label || null,
    language: track.language || null,
    inBandMetadataTrackDispatchType: track.inBandMetadataTrackDispatchType || null,
    mode: track.mode || null
  };
}

function cueToJson(cue) {
  const base = {
    id: cue.id || null,
    startTime: cue.startTime,
    endTime: cue.endTime
  };

  if (typeof cue.text === 'string') {
    base.text = cue.text;
  }

  if ('value' in cue) {
    base.value = cue.value;
  }

  return base;
}

function attachTextTrack(track) {
  if (textTrackListeners.has(track)) {
    return;
  }

  if (track.mode === 'disabled') {
    track.mode = 'hidden';
  }

  const handler = () => {
    const activeCues = track.activeCues
      ? Array.from(track.activeCues).map(cueToJson)
      : [];
    displayMetadata({
      event: 'TextTrack.cuechange',
      track: trackInfo(track),
      activeCues
    });
  };

  track.addEventListener('cuechange', handler);
  textTrackListeners.set(track, handler);
}

function detachTextTrack(track) {
  const handler = textTrackListeners.get(track);
  if (!handler) {
    return;
  }

  track.removeEventListener('cuechange', handler);
  textTrackListeners.delete(track);
}

function enableTextTrackApi() {
  if (textTrackEnabled) {
    return;
  }

  textTrackEnabled = true;
  const trackList = audio.textTracks;

  for (const track of trackList) {
    attachTextTrack(track);
  }

  trackListAddHandler = (event) => {
    if (event.track) {
      attachTextTrack(event.track);
    }
  };

  trackListRemoveHandler = (event) => {
    if (event.track) {
      detachTextTrack(event.track);
    }
  };

  trackList.addEventListener('addtrack', trackListAddHandler);
  trackList.addEventListener('removetrack', trackListRemoveHandler);

  displayMetadata({
    event: 'TextTrack',
    message: 'Native TextTrack API enabled.',
    trackCount: trackList.length
  });
}

function disableTextTrackApi() {
  if (!textTrackEnabled) {
    return;
  }

  textTrackEnabled = false;
  const trackList = audio.textTracks;

  for (const track of trackList) {
    detachTextTrack(track);
  }

  if (trackListAddHandler) {
    trackList.removeEventListener('addtrack', trackListAddHandler);
    trackListAddHandler = null;
  }

  if (trackListRemoveHandler) {
    trackList.removeEventListener('removetrack', trackListRemoveHandler);
    trackListRemoveHandler = null;
  }

  displayMetadata({
    event: 'TextTrack',
    message: 'Native TextTrack API disabled.'
  });
}

if (useTextTrackCheckbox) {
  useTextTrackCheckbox.addEventListener('change', () => {
    if (useTextTrackCheckbox.checked) {
      enableTextTrackApi();
    } else {
      disableTextTrackApi();
    }
  });
}

function bindAudioEvents() {
  if (audioEventsBound) {
    return;
  }

  const audioEvents = [
    'loadedmetadata',
    'durationchange',
    'canplay',
    'play',
    'pause',
    'timeupdate',
    'waiting',
    'stalled',
    'ended',
    'error'
  ];

  audioEvents.forEach((evt) => {
    const handler = () => {
      const extra = evt === 'error' && audio.error
        ? { mediaError: { code: audio.error.code, message: audio.error.message || null } }
        : {};
      displayAudioState(evt, extra);
    };

    audio.addEventListener(evt, handler);
    audioEventHandlers.set(evt, handler);
  });

  audioEventsBound = true;
}

function cleanupCurrentStream() {
  if (hls) {
    hls.destroy();
    hls = null;
  }

  if (flvPlayer) {
    flvPlayer.destroy();
    flvPlayer = null;
  }

  hlsActive = false;
  flvActive = false;

  audio.pause();
  audio.removeAttribute('src');
  audio.load();

  if (flvMediaInfoPre) {
    flvMediaInfoPre.textContent = '';
  }
}

function tryAutoPlay() {
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch((error) => {
      displayMetadata({
        event: 'autoplay-blocked',
        message: 'Autoplay was blocked by the browser. Click play to start.',
        error: error?.message || String(error)
      });
    });
  }
}

function loadStream(url) {
  const trimmed = url.trim();
  if (!trimmed) {
    displayMetadata({ event: 'ERROR', message: 'Stream URL is empty.' });
    return;
  }

  cleanupCurrentStream();
  bindAudioEvents();

  if (isHlsUrl(trimmed) && Hls.isSupported()) {
    hlsActive = true;
    flvActive = false;
    if (useTextTrackCheckbox) {
      useTextTrackCheckbox.disabled = false;
    }
    hls = new Hls({
      enableWebVTT: true,
      enableCEA708Captions: true,
      debug: false
    });
    hls.loadSource(trimmed);
    hls.attachMedia(audio);

    const hlsEvents = [
      Hls.Events.FRAG_PARSING_METADATA,
      Hls.Events.FRAG_PARSING_INIT_SEGMENT,
      Hls.Events.FRAG_CHANGED,
      Hls.Events.FRAG_LOADED,
      Hls.Events.FRAG_DECRYPTED,
      Hls.Events.FRAG_PARSING_USERDATA,
      Hls.Events.FRAG_PARSING_DATA
    ];

    hlsEvents.forEach((evt) => {
      hls.on(evt, function (event, data) {
        displayMetadata({ event, ...data }, true);
      });
    });

    hls.on(Hls.Events.ERROR, function (event, data) {
      displayMetadata({ event: 'ERROR', ...data }, true);
    });

    displayMetadata({
      event: 'INFO',
      message: 'HLS.js playback enabled.',
      url: trimmed
    }, true);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      tryAutoPlay();
    });
  } else if ((isFlvUrl(trimmed) || isExtensionlessUrl(trimmed)) && window.flvjs && flvjs.isSupported()) {
    hlsActive = false;
    flvActive = true;
    if (metadataPre) {
      metadataPre.textContent = '';
    }
    if (useTextTrackCheckbox) {
      useTextTrackCheckbox.checked = false;
      useTextTrackCheckbox.disabled = true;
      disableTextTrackApi();
    }
    flvPlayer = flvjs.createPlayer({
      type: 'flv',
      url: trimmed,
      isLive: true
    });
    flvPlayer.attachMediaElement(audio);
    flvPlayer.load();
    attachFlvEventLogging(flvPlayer);

    flvPlayer.on(flvjs.Events.METADATA_ARRIVED, (metadata) => {
      appendMetadataLine(JSON.stringify({ event: 'FLV_METADATA_ARRIVED', metadata }, null, 2));
    });

    flvPlayer.on(flvjs.Events.SCRIPT_DATA_ARRIVED, (data) => {
      appendMetadataLine(`[flv.js] scriptdata_arrived ${data ? JSON.stringify(data) : ''}`.trim());
      if (data && data.onCuePoint) {
        appendMetadataLine(JSON.stringify({ event: 'FLV_CUE_POINT', cuePoint: data.onCuePoint }, null, 2));
        return;
      }
      if (data && data.onListenerInfo) {
        appendMetadataLine(JSON.stringify({ event: 'FLV_LISTENER_INFO', listenerInfo: data.onListenerInfo }, null, 2));
        return;
      }
      if (data && data.onMetaData) {
        appendMetadataLine(JSON.stringify({ event: 'FLV_ON_METADATA', metadata: data.onMetaData }, null, 2));
        return;
      }
      appendMetadataLine(JSON.stringify({ event: 'FLV_SCRIPT_DATA_ARRIVED', data }, null, 2));
    });

    flvPlayer.on(flvjs.Events.MEDIA_INFO, (info) => {
      displayFlvMediaInfo({ event: 'FLV_MEDIA_INFO', info });
    });

    flvPlayer.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo) => {
      appendMetadataLine(JSON.stringify({
        event: 'FLV_ERROR',
        errorType,
        errorDetail,
        errorInfo
      }, null, 2));
    });

    appendMetadataLine(JSON.stringify({
      event: 'INFO',
      message: 'FLV.js playback enabled.',
      url: trimmed
    }, null, 2));
    tryAutoPlay();
  } else if (!isHlsUrl(trimmed)) {
    hlsActive = false;
    flvActive = false;
    if (useTextTrackCheckbox) {
      useTextTrackCheckbox.disabled = false;
    }
    audio.src = trimmed;
    displayMetadata({
      event: 'INFO',
      message: 'Non-HLS stream detected. Using native audio playback.',
      url: trimmed
    });
    tryAutoPlay();
  } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    hlsActive = false;
    flvActive = false;
    if (useTextTrackCheckbox) {
      useTextTrackCheckbox.disabled = false;
    }
    audio.src = trimmed;
    audio.addEventListener('loadedmetadata', function () {
      displayMetadata({ event: 'loadedmetadata', message: 'Native HLS loaded.' });
    }, { once: true });
    tryAutoPlay();
  } else {
    hlsActive = false;
    flvActive = false;
    if (useTextTrackCheckbox) {
      useTextTrackCheckbox.disabled = false;
    }
    displayMetadata({ error: 'HLS.js is not supported in this browser.' });
  }
}

if (streamUrlInput) {
  streamUrlInput.value = defaultStreamUrl;
}

if (exampleStreamsSelect) {
  exampleStreamsSelect.addEventListener('change', () => {
    const selected = exampleStreamsSelect.value;
    if (selected) {
      if (streamUrlInput) {
        streamUrlInput.value = selected;
      }
      loadStream(selected);
    }
  });
}

if (loadStreamButton) {
  loadStreamButton.addEventListener('click', () => {
    loadStream(streamUrlInput ? streamUrlInput.value : defaultStreamUrl);
  });
}

if (streamUrlInput) {
  streamUrlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      loadStream(streamUrlInput.value);
    }
  });
}

loadStream(defaultStreamUrl);
