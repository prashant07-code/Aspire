const elements = {
  complaintForm: document.querySelector("#complaintForm"),
  citizenName: document.querySelector("#citizenName"),
  phoneNumber: document.querySelector("#phoneNumber"),
  area: document.querySelector("#area"),
  startRecording: document.querySelector("#startRecording"),
  stopRecording: document.querySelector("#stopRecording"),
  audioUpload: document.querySelector("#audioUpload"),
  recordingStatus: document.querySelector("#recordingStatus"),
  audioPreview: document.querySelector("#audioPreview"),
  languageCode: document.querySelector("#languageCode"),
  transcriptionMode: document.querySelector("#transcriptionMode"),
  transcribeButton: document.querySelector("#transcribeButton"),
  transcript: document.querySelector("#transcript"),
  description: document.querySelector("#description"),
  selectedCategory: document.querySelector("#selectedCategory"),
  classificationBox: document.querySelector("#classificationBox"),
  useLocation: document.querySelector("#useLocation"),
  locationStatus: document.querySelector("#locationStatus"),
  locationAddress: document.querySelector("#locationAddress"),
  successBox: document.querySelector("#successBox")
};

const state = {
  categories: [],
  audio: null,
  recordingStream: null,
  mediaRecorder: null,
  recordingInterval: null,
  recordingStartedAt: null,
  location: null,
  transcription: null
};

const MAX_RECORD_SECONDS = 30;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character] || character;
  });
}

function setStatus(message) {
  elements.recordingStatus.textContent = message;
}

function setLocationStatus(message) {
  elements.locationStatus.textContent = message;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function renderCategoryOptions(categories) {
  elements.selectedCategory.innerHTML = categories
    .map(
      (category) =>
        `<option value="${category.slug}">${category.label} - ${category.department}</option>`
    )
    .join("");
}

function renderClassification(classification) {
  if (!classification) {
    elements.classificationBox.innerHTML =
      "<strong>No category predicted yet.</strong><p>Run speech transcription or type a complaint to see a smart suggestion.</p>";
    return;
  }

  const alternativeMarkup = classification.alternatives?.length
    ? `<p>Alternatives: ${classification.alternatives
        .map((item) => `${item.label} (${Math.round(item.confidence * 100)}%)`)
        .join(", ")}</p>`
    : "";

  elements.classificationBox.innerHTML = `
    <strong>${classification.recommendedCategory.label}</strong>
    <p><span class="confidence-chip">${Math.round(classification.confidence * 100)}% confidence</span></p>
    <p>Department: ${classification.recommendedCategory.department}</p>
    <p>Keywords: ${
      classification.matchedKeywords?.length
        ? classification.matchedKeywords.join(", ")
        : "No direct keywords matched"
    }</p>
    <p>${
      classification.requiresValidation
        ? "Low confidence detected. User confirmation is recommended."
        : "Category confidence is strong enough for direct filing."
    }</p>
    ${alternativeMarkup}
  `;
}

function setAudioState({ blob, mimeType, label }) {
  state.audio = { blob, mimeType, label };
  const objectUrl = URL.createObjectURL(blob);
  elements.audioPreview.src = objectUrl;
  elements.audioPreview.classList.remove("hidden");
  setStatus(`${label} ready for transcription.`);
}

async function populateCategories() {
  const response = await fetch("/api/categories");
  const payload = await response.json();
  state.categories = payload.categories || [];
  renderCategoryOptions(state.categories);
}

async function startRecording() {
  try {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("This browser does not support microphone recording.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType: preferredMimeType });
    const chunks = [];

    state.recordingStream = stream;
    state.mediaRecorder = recorder;
    state.recordingStartedAt = Date.now();
    elements.startRecording.disabled = true;
    elements.stopRecording.disabled = false;
    elements.successBox.classList.add("hidden");

    recorder.ondataavailable = (event) => {
      if (event.data?.size) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = async () => {
      clearInterval(state.recordingInterval);
      const blob = new Blob(chunks, { type: recorder.mimeType || preferredMimeType });
      setAudioState({
        blob,
        mimeType: blob.type || preferredMimeType,
        label: "Recorded audio"
      });
      state.recordingStream?.getTracks().forEach((track) => track.stop());
      state.mediaRecorder = null;
      state.recordingStream = null;
      elements.startRecording.disabled = false;
      elements.stopRecording.disabled = true;
    };

    recorder.start();

    state.recordingInterval = window.setInterval(() => {
      const elapsed = Math.min(
        MAX_RECORD_SECONDS,
        Math.floor((Date.now() - state.recordingStartedAt) / 1000)
      );
      setStatus(`Recording... ${elapsed}s / ${MAX_RECORD_SECONDS}s`);

      if (elapsed >= MAX_RECORD_SECONDS) {
        stopRecording();
      }
    }, 250);
  } catch (error) {
    setStatus(error.message || "Unable to start recording.");
    elements.startRecording.disabled = false;
    elements.stopRecording.disabled = true;
  }
}

function stopRecording() {
  if (state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
  }
}

function handleAudioUpload(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  setAudioState({
    blob: file,
    mimeType: file.type || "audio/webm",
    label: `Uploaded audio: ${file.name}`
  });
}

async function runTranscription() {
  if (!state.audio?.blob) {
    setStatus("Please record or upload audio first.");
    return;
  }

  setStatus("Sending audio to Sarvam AI for transcription...");

  try {
    const audioBase64 = await blobToDataUrl(state.audio.blob);
    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        audioBase64,
        mimeType: state.audio.mimeType,
        languageCode: elements.languageCode.value,
        mode: elements.transcriptionMode.value
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Transcription failed.");
    }

    elements.transcript.value = payload.transcript.transcript || "";
    if (!elements.description.value.trim()) {
      elements.description.value = payload.transcript.transcript || "";
    }

    state.transcription = payload.transcript;
    renderClassification(payload.classification);

    if (payload.classification?.recommendedCategory?.slug) {
      elements.selectedCategory.value = payload.classification.recommendedCategory.slug;
    }

    setStatus(
      `Transcript ready in ${
        payload.transcript.languageCode || "auto-detected language"
      }.`
    );
  } catch (error) {
    setStatus(error.message);
  }
}

function captureLocation() {
  if (!navigator.geolocation) {
    setLocationStatus("Geolocation is not available in this browser.");
    return;
  }

  setLocationStatus("Fetching current location...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        address: elements.locationAddress.value.trim(),
        source: "browser"
      };

      setLocationStatus(
        `Location captured: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)} (accuracy ${Math.round(position.coords.accuracy)}m)`
      );
    },
    (error) => {
      setLocationStatus(`Unable to fetch location: ${error.message}`);
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    }
  );
}

function buildLocationPayload() {
  return {
    ...(state.location || {}),
    address: elements.locationAddress.value.trim()
  };
}

async function submitComplaint(event) {
  event.preventDefault();

  const transcript = elements.transcript.value.trim();
  const description = elements.description.value.trim();

  if (!transcript && !description) {
    elements.successBox.classList.remove("hidden");
    elements.successBox.innerHTML =
      "<strong>Complaint text missing</strong><p>Please transcribe the audio or type the complaint details before submitting.</p>";
    return;
  }

  try {
    const response = await fetch("/api/complaints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        citizenName: elements.citizenName.value,
        phoneNumber: elements.phoneNumber.value,
        area: elements.area.value,
        transcript,
        description,
        selectedCategory: elements.selectedCategory.value,
        languageCode: elements.languageCode.value,
        location: buildLocationPayload(),
        transcription: state.transcription
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      elements.successBox.classList.remove("hidden");
      elements.successBox.innerHTML = `<strong>Submission failed</strong><p>${payload.error || "Unable to save complaint."}</p>`;
      return;
    }

    elements.successBox.classList.remove("hidden");
    elements.successBox.innerHTML = `
      <strong>Complaint saved successfully</strong>
      <p><span class="tracking-chip">${escapeHtml(payload.complaint.trackingId)}</span></p>
      <p>Category: ${escapeHtml(payload.complaint.category.label)}</p>
      <p>Status: ${escapeHtml(payload.complaint.status)}</p>
      <p>Created: ${formatDate(payload.complaint.createdAt)}</p>
      <p>
        <a class="inline-link" href="/track?trackingId=${encodeURIComponent(
          payload.complaint.trackingId
        )}">Track this complaint</a>
      </p>
    `;
  } catch (error) {
    elements.successBox.classList.remove("hidden");
    elements.successBox.innerHTML = `<strong>Submission failed</strong><p>${error.message || "Unable to save complaint."}</p>`;
  }
}

elements.startRecording.addEventListener("click", startRecording);
elements.stopRecording.addEventListener("click", stopRecording);
elements.audioUpload.addEventListener("change", handleAudioUpload);
elements.transcribeButton.addEventListener("click", runTranscription);
elements.useLocation.addEventListener("click", captureLocation);
elements.complaintForm.addEventListener("submit", submitComplaint);

populateCategories().catch((error) => {
  setStatus(`Unable to load categories: ${error.message}`);
});
