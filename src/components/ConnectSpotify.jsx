function ConnectSpotify({ status, error, onConnect, onDisconnect }) {
  const isConnected = status === "connected" || status === "refreshing";
  const isBusy = status === "authorizing" || status === "refreshing";

  return (
    <section className="spotify-connection" aria-live="polite">
      {isConnected ? (
        <>
          <p className="spotify-connection__status">
            <span className="spotify-connection__dot" aria-hidden="true" />
            {status === "refreshing" ? "Refreshing Spotify…" : "Spotify connected"}
          </p>
          <button type="button" onClick={onDisconnect} disabled={isBusy}>
            Disconnect
          </button>
        </>
      ) : (
        <button type="button" onClick={onConnect} disabled={isBusy}>
          {isBusy ? "Connecting…" : error ? "Reconnect Spotify" : "Connect Spotify"}
        </button>
      )}

      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export default ConnectSpotify;
