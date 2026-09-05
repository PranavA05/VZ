import { useRef } from "react";
import FaceArtwork from "./FaceArtwork";
import CircularProgress from "./CircularProgress";
import Visualizer from "./Visualizer";

function VisualizerStage({ playback, receivedAt, isTrackChanging, theme }) {
  const sceneRef = useRef({ specialObject: null });

  return (
    <div className="visualizer-stage">
      <Visualizer
        isPlaying={playback.isPlaying}
        trackId={playback.track?.id ?? null}
        isTrackChanging={isTrackChanging}
        theme={theme}
        sceneRef={sceneRef}
      />
      <CircularProgress playback={playback} receivedAt={receivedAt} />
      <FaceArtwork
        artworkUrl={playback.track?.artworkUrl ?? null}
        isPlaying={playback.isPlaying}
        hasTrack={Boolean(playback.track)}
        isTrackChanging={isTrackChanging}
        motionSpeed={theme.motionSpeed}
        sceneRef={sceneRef}
      />
    </div>
  );
}

export default VisualizerStage;
