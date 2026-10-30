import React, { useEffect, useRef } from 'react';
import cx from 'classnames';
import {
  defineMessages,
  useIntl,
} from 'react-intl';
import { useCurrentMediaFile } from 'components/utils/hooks';
import {
  EVENTS,
  ID,
} from 'utils/constants';
import {
  buildFileURL,
  getCurrentMediaFile,
  getFileType,
  getMediaFileState,
} from 'utils/data';
import storage from 'utils/data/storage';
import logger from 'utils/logger';
import player from 'utils/player';
import './index.scss';

const intlMessages = defineMessages({
  aria: {
    id: 'player.mediaFile.wrapper.aria',
    description: 'Aria label for the media file wrapper',
  },
  audio: {
    id: 'player.mediaFile.audio',
    description: 'Label shown while an audio file plays',
  },
});

// Seconds the media element may drift before it is pulled back to the recorded position. The clock
// ticks ten times a second, so anything larger than half a second is a seek, not scheduling noise.
const DRIFT = 0.5;

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv', 'mov', 'mkv'];

const isVideoFile = (filename) => VIDEO_EXTENSIONS.includes(getFileType(filename.toLowerCase()));

// The recording clock is the master: the media element only follows it, so a pause, a seek or a
// change of rate in the recording is reproduced instead of being left to the browser.
const sync = (element, mediaFile, time) => {
  if (!element) return;

  // The recording clock decides, not the recorded trail: a recording paused in the middle of a
  // playing media file stops it, and the trail only says where the file stood at that instant.
  const master = player.webcams;
  const masterPaused = !master || master.isDisposed() || master.paused();

  if (!mediaFile) {
    if (!element.paused) element.pause();
    return;
  }

  const url = buildFileURL(mediaFile.path);
  if (element.dataset.source !== url) {
    element.dataset.source = url;
    element.src = url;
  }

  const { position, playing, rate } = getMediaFileState(mediaFile, time);

  if (element.playbackRate !== rate) element.playbackRate = rate;

  // currentTime is not settable until the browser knows the duration
  if (element.readyState === 0) return;

  if (Math.abs(element.currentTime - position) > DRIFT) element.currentTime = position;

  if (playing && !masterPaused && element.paused) {
    element.play().catch((error) => logger.debug(ID.MEDIA_FILES, error));
  } else if ((!playing || masterPaused) && !element.paused) {
    element.pause();
  }
};

const MediaFile = () => {
  const intl = useIntl();
  const mediaFile = useCurrentMediaFile();
  const element = useRef();

  useEffect(() => {
    const handleTimeUpdate = (event) => {
      const { time } = event.detail;
      sync(element.current, getCurrentMediaFile(storage.mediaFiles, time), time);
    };

    // A tick with the element still loading is dropped, because the position cannot be set before
    // the duration is known. Recording paused, the only chance to place the file is this event.
    const handleLoadedMetadata = () => {
      const master = player.webcams;
      const time = master && !master.isDisposed() ? master.currentTime() : 0;
      sync(element.current, getCurrentMediaFile(storage.mediaFiles, time), time);
    };

    const media = element.current;
    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    document.addEventListener(EVENTS.TIME_UPDATE, handleTimeUpdate);

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      document.removeEventListener(EVENTS.TIME_UPDATE, handleTimeUpdate);
    };
  }, []);

  const video = mediaFile ? isVideoFile(mediaFile.filename) : false;

  return (
    <div
      aria-label={intl.formatMessage(intlMessages.aria)}
      className={cx('media-file', { inactive: !mediaFile })}
      id={ID.MEDIA_FILES}
    >
      <video
        className={cx('media-file-media', { audio: !video })}
        playsInline
        preload="auto"
        ref={element}
      />
      {mediaFile ? (
        <span className="media-file-name">
          {video ? mediaFile.filename : intl.formatMessage(intlMessages.audio)}
        </span>
      ) : null}
    </div>
  );
};

const areEqual = () => true;

export default React.memo(MediaFile, areEqual);
