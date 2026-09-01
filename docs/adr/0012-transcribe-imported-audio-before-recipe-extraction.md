# Transcribe imported audio before recipe extraction

Audio enters Folio only as an existing user-selected file, not as an in-app recording. `capture-recipe` stores the file, converts it to a bounded audio transcript through a replaceable speech-to-text adapter, retains that transcript and its versioned metadata for deterministic retries, and sends it through the same recipe-evidence and RecipeGraph extraction boundary as every other source; this avoids microphone permissions and recording state while keeping transcription providers replaceable and recipe interpretation canonical.
