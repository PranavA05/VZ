import { useId, useRef } from "react";
import faceModelUrl from "../assets/face-model.png";
import { useFaceAnimation } from "../hooks/useFaceAnimation.js";

function EyeArtwork({ side, artworkUrl, irisRef }) {
  const id = useId();
  const socket = "M0 10 C20 15 27 0 52 2 C75 3 89 16 100 32 C78 32 66 42 39 39 C20 37 9 23 0 10Z";
  const irisX = side === "left" ? 53 : 47;

  return (
    <svg
      className={`face-artwork__eye face-artwork__eye--${side}`}
      viewBox="0 0 100 42"
      focusable="false"
    >
      <defs>
        <clipPath id={`${id}-socket`}>
          <path d={socket} transform={side === "right" ? "translate(100 0) scale(-1 1)" : undefined} />
        </clipPath>
        <clipPath id={`${id}-iris`}>
          <circle cx={irisX} cy="21" r="19" />
        </clipPath>
        <radialGradient id={`${id}-sclera`}>
          <stop offset="0" stopColor="#8a8b83" />
          <stop offset="0.65" stopColor="#62655f" />
          <stop offset="1" stopColor="#242825" />
        </radialGradient>
        <radialGradient id={`${id}-iris-shade`}>
          <stop offset="0.3" stopColor="#090b0a" stopOpacity="0" />
          <stop offset="0.8" stopColor="#090b0a" stopOpacity="0.2" />
          <stop offset="1" stopColor="#090b0a" stopOpacity="0.9" />
        </radialGradient>
        <linearGradient id={`${id}-shadow`} x2="0" y2="1">
          <stop offset="0" stopColor="#080a09" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#080a09" stopOpacity="0" />
          <stop offset="1" stopColor="#080a09" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`${id}-lid`} x2="0" y2="1">
          <stop offset="0" stopColor="#444643" />
          <stop offset="0.65" stopColor="#72746f" />
          <stop offset="1" stopColor="#454743" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}-socket)`}>
        <path d="M0 0H100V42H0Z" fill={`url(#${id}-sclera)`} />
        <g ref={irisRef} className="iris-group">
          <circle cx={irisX} cy="21" r="19" fill="#555f52" />
          {artworkUrl && (
            <image
              key={artworkUrl}
              className="face-artwork__album"
              href={artworkUrl}
              x={irisX - 19}
              y="2"
              width="38"
              height="38"
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${id}-iris)`}
            />
          )}
          <circle cx={irisX} cy="21" r="19" fill={`url(#${id}-iris-shade)`} />
          <circle cx={irisX} cy="21" r="6.5" fill="#090b0a" />
          <ellipse cx={irisX - 6} cy="12" rx="3" ry="1.8" fill="#d8dbd2" opacity="0.45" />
        </g>
        <path d="M0 0H100V42H0Z" fill={`url(#${id}-shadow)`} />
        <g fill={`url(#${id}-lid)`} stroke="#343632" strokeWidth="0.6">
          <path className="face-artwork__lid face-artwork__lid--upper" d="M-4 -48H104V-4Q50 -14 -4 -4Z" />
          <path className="face-artwork__lid face-artwork__lid--lower" d="M-4 48Q50 38 104 48V96H-4Z" />
        </g>
      </g>
    </svg>
  );
}

function FaceArtwork({
  artworkUrl,
  isPlaying,
  hasTrack,
  isTrackChanging,
  motionSpeed,
  sceneRef,
}) {
  const leftIrisRef = useRef(null);
  const rightIrisRef = useRef(null);
  const faceRef = useFaceAnimation({
    isPlaying,
    hasTrack,
    isTrackChanging,
    motionSpeed,
    leftIrisRef,
    rightIrisRef,
    sceneRef,
  });
  return (
    <div className="face-artwork" aria-hidden="true">
      <div className="face-artwork__motion" ref={faceRef}>
        <img
          className="face-artwork__model"
          src={faceModelUrl}
          alt=""
          draggable={false}
        />
        <EyeArtwork side="left" artworkUrl={artworkUrl} irisRef={leftIrisRef} />
        <EyeArtwork side="right" artworkUrl={artworkUrl} irisRef={rightIrisRef} />
      </div>
    </div>
  );
}

export default FaceArtwork;
