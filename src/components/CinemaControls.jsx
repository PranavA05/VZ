function CinemaControls({ isCinemaMode, onEnter, onExit }) {
  return (
    <div className="cinema-control">
      <button
        type="button"
        onClick={isCinemaMode ? onExit : onEnter}
        aria-pressed={isCinemaMode}
        title={isCinemaMode ? "Exit cinema mode (Esc)" : "Cinema mode (F)"}
      >
        {isCinemaMode ? "Exit cinema" : "Cinema mode"}
      </button>
    </div>
  );
}

export default CinemaControls;
