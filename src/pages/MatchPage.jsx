import VideoMatchForm from '../components/VideoMatchForm';

export default function MatchPage() {
  return (
    <div className="page">
      <h1>Match Music to Video</h1>
      <p className="upload-hint">
        Upload a short video and AI will find tracks that match its mood and energy.
      </p>
      <VideoMatchForm />
    </div>
  );
}
