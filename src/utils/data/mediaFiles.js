import {
  getMostRecentEvent,
  isActive,
  isEmpty,
} from 'utils/data/validators';

// The media file playing at `time`, or null. Entries are one per play of a file and cover
// [timestamp, stopTimestamp).
const getCurrentMediaFile = (data, time) => {
  if (isEmpty(data)) return null;

  const mediaFile = getMostRecentEvent(data, time);
  if (!mediaFile) return null;

  if (!isActive(time, mediaFile.timestamp, mediaFile.stopTimestamp)) return null;

  return mediaFile;
};

// Position inside the media file at recording time `time`: the last update tells where the file was,
// and a playing update keeps it moving at its own rate from there.
const getMediaFileState = (mediaFile, time) => {
  const state = { position: 0, playing: false, rate: 1 };

  if (!mediaFile || isEmpty(mediaFile.updates)) return state;

  const update = getMostRecentEvent(mediaFile.updates, time);
  if (!update) return state;

  const rate = update.rate > 0 ? update.rate : 1;
  const playing = update.status === 'play';

  let position = update.time > 0 ? update.time : 0;
  if (playing) position += (time - update.timestamp) * rate;
  if (mediaFile.duration > 0) position = Math.min(position, mediaFile.duration);

  return {
    position: Math.max(position, 0),
    playing,
    rate,
  };
};

export {
  getCurrentMediaFile,
  getMediaFileState,
};
