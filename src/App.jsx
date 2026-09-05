import { useEffect } from 'react'
import './App.css'
import CinemaControls from './components/CinemaControls'
import ConnectSpotify from './components/ConnectSpotify'
import NowPlaying from './components/NowPlaying'
import VisualizerStage from './components/VisualizerStage'
import { usePlayback } from './hooks/usePlayback'
import { useCinemaMode } from './hooks/useCinemaMode'
import { useSpotifyAuth } from './hooks/useSpotifyAuth'
import { useTrackPresentation } from './hooks/useTrackPresentation'
import { useTrackTransition } from './hooks/useTrackTransition'
import { resolveTheme } from './theme/resolveTheme.js'

function App() {
  const { session, status, error, connect, disconnect, refresh } = useSpotifyAuth()
  const { isCinemaMode, enterCinemaMode, exitCinemaMode } = useCinemaMode(
    Boolean(session),
  )
  const {
    playback: livePlayback,
    receivedAt: liveReceivedAt,
    loading: playbackLoading,
    error: playbackError,
    retry: retryPlayback,
  } = usePlayback(session, refresh)
  const {
    playback,
    receivedAt,
    isPreparing: isPreparingTrack,
    artworkPalette,
  } = useTrackPresentation(livePlayback, liveReceivedAt)
  const trackId = playback.track?.id ?? null
  const trackTitle = playback.track?.title
  const primaryArtist = playback.track?.artists[0]
  const isTrackChanging = useTrackTransition(trackId)
  const theme = resolveTheme(playback.track, artworkPalette)

  useEffect(() => {
    document.title = trackTitle
      ? `${trackTitle}${primaryArtist ? ` — ${primaryArtist}` : ''}`
      : 'Music Visualizer'
  }, [primaryArtist, trackTitle])

  return (
    <main
      className={`app-shell${session ? ' is-connected' : ''}${isCinemaMode ? ' is-cinema' : ''}`}
      style={{
        '--accent': `rgb(${theme.accent.join(' ')})`,
        '--gradient-start': `rgb(${theme.gradientStart.join(' ')})`,
        '--gradient-end': `rgb(${theme.gradientEnd.join(' ')})`,
      }}
    >
      <header className="app-header">
        <p className="app-header__eyebrow">Live playback study</p>
        <h1>Music Visualizer</h1>
        <p className="app-header__description">
          Your current track, reflected through motion and gaze.
        </p>
      </header>

      <section className="visualizer-experience" aria-label="Music visualizer">
        <VisualizerStage
          playback={playback}
          receivedAt={receivedAt}
          isTrackChanging={isTrackChanging}
          theme={theme}
        />
        {session && (
          <NowPlaying
            key={trackId ?? 'no-track'}
            playback={playback}
            receivedAt={receivedAt}
            preparing={isPreparingTrack}
            loading={playbackLoading}
            error={playbackError}
            onRetry={retryPlayback}
          />
        )}
        <ConnectSpotify
          status={status}
          error={error}
          onConnect={connect}
          onDisconnect={disconnect}
        />
        {session && (
          <CinemaControls
            isCinemaMode={isCinemaMode}
            onEnter={enterCinemaMode}
            onExit={exitCinemaMode}
          />
        )}
      </section>
    </main>
  )
}

export default App
