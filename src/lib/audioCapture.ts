let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export function startRecording(stream: MediaStream): void {
  if (mediaRecorder && mediaRecorder.state === 'recording') return;
  audioChunks = [];
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus' : 'audio/webm';
  mediaRecorder = new MediaRecorder(stream, { mimeType });
  mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.push(event.data); };
  mediaRecorder.start(100);
}

export function stopRecording(): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') { resolve(null); return; }
    mediaRecorder.onstop = () => {
      if (audioChunks.length === 0) { resolve(null); return; }
      const blob = new Blob(audioChunks, { type: mediaRecorder!.mimeType });
      audioChunks = [];
      resolve(blob);
    };
    mediaRecorder.stop();
  });
}

export function cancelRecording(): void {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.ondataavailable = null;
    audioChunks = [];
    mediaRecorder.stop();
  }
}