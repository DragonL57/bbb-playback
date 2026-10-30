import {
  getCurrentMediaFile,
  getMediaFileState,
} from './mediaFiles';

const data = [
  {
    timestamp: 3,
    stopTimestamp: 10,
    duration: 12,
    updates: [
      { timestamp: 3, time: 0, status: 'play', rate: 1 },
      { timestamp: 8, time: 5, status: 'pause', rate: 1 },
    ],
  },
  {
    timestamp: 12,
    stopTimestamp: 20,
    duration: 12,
    updates: [{ timestamp: 12, time: 0, status: 'play', rate: 1 }],
  },
];

it('finds the media file playing at a given time', () => {
  // Before it starts
  expect(getCurrentMediaFile(data, 2.9)).toEqual(null);

  // Start is inclusive
  expect(getCurrentMediaFile(data, 3)).toEqual(data[0]);

  // Inside the first play
  expect(getCurrentMediaFile(data, 7)).toEqual(data[0]);

  // After the stop, before the next play: the player has to be silent here
  expect(getCurrentMediaFile(data, 10)).toEqual(null);
  expect(getCurrentMediaFile(data, 11.9)).toEqual(null);

  // Second play of the same file
  expect(getCurrentMediaFile(data, 15)).toEqual(data[1]);
  expect(getCurrentMediaFile(data, 20)).toEqual(null);

  // Nothing loaded
  expect(getCurrentMediaFile(null, 5)).toEqual(null);
  expect(getCurrentMediaFile([], 5)).toEqual(null);
});

it('follows the updates trail to the position inside the media file', () => {
  // Playing: two seconds of recording, two seconds of media
  expect(getMediaFileState(data[0], 5)).toEqual({ position: 2, playing: true, rate: 1 });

  // Paused: the position stays where the pause update left it
  expect(getMediaFileState(data[0], 9)).toEqual({ position: 5, playing: false, rate: 1 });

  // A double rate advance
  const fast = {
    timestamp: 3,
    stopTimestamp: 10,
    duration: 12,
    updates: [{ timestamp: 3, time: 1, status: 'play', rate: 2 }],
  };
  expect(getMediaFileState(fast, 5)).toEqual({ position: 5, playing: true, rate: 2 });

  // Never beyond the file duration
  const long = {
    timestamp: 3,
    stopTimestamp: 30,
    duration: 6,
    updates: [{ timestamp: 3, time: 0, status: 'play', rate: 1 }],
  };
  expect(getMediaFileState(long, 25)).toEqual({ position: 6, playing: true, rate: 1 });

  // Nothing to play yet
  expect(getMediaFileState({ timestamp: 3, updates: [] }, 5))
    .toEqual({ position: 0, playing: false, rate: 1 });
  expect(getMediaFileState(null, 5)).toEqual({ position: 0, playing: false, rate: 1 });
});
