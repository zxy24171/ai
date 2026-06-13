let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export function startRecording(stream: MediaStream): Promise<void> {
  return new Promise((resolve) => {
    audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm';
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.push(event.data); };
    mediaRecorder.onstart = () => resolve();
    mediaRecorder.start(100);
  });
}

export function stopRecording(): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') { resolve(null); return; }
    const existingRecorder = mediaRecorder;
    const existingChunks = audioChunks;
    audioChunks = [];
    mediaRecorder = null;
    existingRecorder.onstop = () => {
      if (existingChunks.length === 0) { resolve(null); return; }
      const blob = new Blob(existingChunks, { type: existingRecorder.mimeType });
      resolve(blob);
    };
    existingRecorder.stop();
  });
}

export function cancelRecording(): void {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.ondataavailable = null;
    audioChunks = [];
    mediaRecorder.stop();
    mediaRecorder = null;
  }
}