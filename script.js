const controls = {
  title: document.getElementById("title-input"),
  filename: document.getElementById("filename-input"),
  fontFamily: document.getElementById("font-family"),
  fontSize: document.getElementById("font-size"),
  backgroundColor: document.getElementById("background-color"),
  textColor: document.getElementById("text-color"),
  bold: document.getElementById("bold-toggle"),
  underline: document.getElementById("underline-toggle"),
  strike: document.getElementById("strike-toggle"),
  sizePreset: document.getElementById("size-preset"),
  width: document.getElementById("image-width"),
  height: document.getElementById("image-height"),
  extension: document.getElementById("image-extension"),
  download: document.getElementById("download-button"),
};

const canvas = document.getElementById("thumbnail-canvas");
const ctx = canvas.getContext("2d");
const previewSize = document.getElementById("preview-size");

const sizePresets = {
  "1200x630": { width: 1200, height: 630 },
  "1024x1024": { width: 1024, height: 1024 },
  "800x450": { width: 800, height: 450 },
};

const mimeTypes = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

function getNumberValue(input, fallback) {
  const value = Number.parseInt(input.value, 10);
  return Number.isFinite(value) ? value : fallback;
}

function syncPresetSize() {
  const selected = sizePresets[controls.sizePreset.value];

  if (!selected) {
    controls.width.disabled = false;
    controls.height.disabled = false;
    return;
  }

  controls.width.value = selected.width;
  controls.height.value = selected.height;
  controls.width.disabled = true;
  controls.height.disabled = true;
}

function markCustomSize() {
  controls.sizePreset.value = "custom";
  controls.width.disabled = false;
  controls.height.disabled = false;
}

function getState() {
  const width = Math.min(Math.max(getNumberValue(controls.width, 1200), 320), 3000);
  const height = Math.min(Math.max(getNumberValue(controls.height, 630), 180), 3000);
  const fontSize = Math.min(Math.max(getNumberValue(controls.fontSize, 72), 24), 180);

  return {
    title: controls.title.value.trim() || "이미지로 생성할 텍스트 입력",
    fontFamily: controls.fontFamily.value,
    fontSize,
    backgroundColor: controls.backgroundColor.value,
    textColor: controls.textColor.value,
    bold: controls.bold.checked,
    underline: controls.underline.checked,
    strike: controls.strike.checked,
    width,
    height,
    extension: controls.extension.value,
  };
}

function getFont(state) {
  const weight = state.bold ? "800" : "500";
  return `${weight} ${state.fontSize}px ${state.fontFamily}`;
}

function getDownloadBaseName() {
  const normalized = controls.filename.value.trim().replace(/[\\/:*?"<>|]+/g, "-");
  return normalized || "TTI";
}

function splitLongToken(token, maxWidth) {
  const chunks = [];
  let current = "";

  Array.from(token).forEach((char) => {
    const next = current + char;

    if (ctx.measureText(next).width > maxWidth && current) {
      chunks.push(current);
      current = char;
      return;
    }

    current = next;
  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function wrapText(text, maxWidth) {
  const sourceLines = text.split(/\n/);
  const lines = [];

  sourceLines.forEach((sourceLine) => {
    const tokens = sourceLine.split(/(\s+)/).filter(Boolean);
    let line = "";

    if (tokens.length === 0) {
      lines.push("");
      return;
    }

    tokens.forEach((token) => {
      const candidate = line + token;

      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        return;
      }

      if (line.trim()) {
        lines.push(line.trim());
        line = "";
      }

      if (ctx.measureText(token).width > maxWidth) {
        const chunks = splitLongToken(token.trim(), maxWidth);
        lines.push(...chunks.slice(0, -1));
        line = chunks[chunks.length - 1] || "";
        return;
      }

      line = token.trim();
    });

    if (line.trim()) {
      lines.push(line.trim());
    }
  });

  return lines.length > 0 ? lines : ["이미지로 생성할 텍스트 입력"];
}

function drawTextDecoration(text, x, baselineY, state, lineHeight) {
  const textWidth = ctx.measureText(text).width;
  const startX = x - textWidth / 2;
  const endX = x + textWidth / 2;
  const lineWidth = Math.max(2, Math.round(state.fontSize / 18));

  ctx.save();
  ctx.strokeStyle = state.textColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  if (state.underline) {
    const y = baselineY + lineHeight * 0.16;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }

  if (state.strike) {
    const y = baselineY - lineHeight * 0.32;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }

  ctx.restore();
}

function renderThumbnail() {
  const state = getState();
  canvas.width = state.width;
  canvas.height = state.height;
  previewSize.textContent = `${state.width} x ${state.height}`;

  ctx.fillStyle = state.backgroundColor;
  ctx.fillRect(0, 0, state.width, state.height);

  const padding = Math.max(36, Math.round(Math.min(state.width, state.height) * 0.08));
  const maxTextWidth = Math.max(160, state.width - padding * 2);
  const lineHeight = Math.round(state.fontSize * 1.28);

  ctx.font = getFont(state);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = state.textColor;

  const lines = wrapText(state.title, maxTextWidth);
  const totalHeight = lines.length * lineHeight;
  const firstBaseline = state.height / 2 - totalHeight / 2 + lineHeight * 0.72;

  lines.forEach((line, index) => {
    const x = state.width / 2;
    const y = firstBaseline + index * lineHeight;
    ctx.fillText(line, x, y);
    drawTextDecoration(line, x, y, state, lineHeight);
  });
}

function downloadThumbnail() {
  const state = getState();
  const extension = state.extension;
  const mimeType = mimeTypes[extension] || "image/png";
  const filename = `${getDownloadBaseName()}.${extension}`;

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        const fallbackUrl = canvas.toDataURL(mimeType, 0.92);
        triggerDownload(fallbackUrl, filename);
        return;
      }

      const url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
      URL.revokeObjectURL(url);
    },
    mimeType,
    extension === "png" ? undefined : 0.92
  );
}

function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

[
  controls.title,
  controls.filename,
  controls.fontFamily,
  controls.fontSize,
  controls.backgroundColor,
  controls.textColor,
  controls.bold,
  controls.underline,
  controls.strike,
  controls.extension,
].forEach((element) => {
  element.addEventListener("input", renderThumbnail);
  element.addEventListener("change", renderThumbnail);
});

controls.sizePreset.addEventListener("change", () => {
  syncPresetSize();
  renderThumbnail();
});

[controls.width, controls.height].forEach((element) => {
  element.addEventListener("input", () => {
    if (!element.disabled) {
      renderThumbnail();
    }
  });
  element.addEventListener("change", () => {
    markCustomSize();
    renderThumbnail();
  });
});

controls.download.addEventListener("click", downloadThumbnail);

syncPresetSize();
renderThumbnail();
