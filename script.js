const controls = {
  editor: document.getElementById("text-editor"),
  filename: document.getElementById("filename-input"),
  fontFamily: document.getElementById("font-family"),
  fontSize: document.getElementById("font-size"),
  backgroundColor: document.getElementById("background-color"),
  transparentBackground: document.getElementById("transparent-background"),
  textColor: document.getElementById("text-color"),
  borderEnabled: document.getElementById("border-enabled"),
  borderWidth: document.getElementById("border-width"),
  borderColor: document.getElementById("border-color"),
  sizePreset: document.getElementById("size-preset"),
  outputScale: document.getElementById("output-scale"),
  width: document.getElementById("image-width"),
  height: document.getElementById("image-height"),
  extension: document.getElementById("image-extension"),
  download: document.getElementById("download-button"),
};

const canvas = document.getElementById("thumbnail-canvas");
const ctx = canvas.getContext("2d");
const previewSize = document.getElementById("preview-size");
const styleButtons = document.querySelectorAll(".style-button");
const textAlignOptions = document.querySelectorAll('input[name="text-align"]');
const shapeOptions = document.querySelectorAll('input[name="image-shape"]');
const borderStyleOptions = document.querySelectorAll('input[name="border-style"]');
const themeOptions = document.querySelectorAll('input[name="ui-theme"]');
const swatches = document.querySelectorAll(".swatch");
const backgroundColorGroup = document.querySelector('[data-color-group="background"]');
const borderOptions = document.getElementById("border-options");
const storageKey = "text-to-img:last-settings";

const defaultText = "텍스트입력";

const sizePresets = {
  "1080x1350": { width: 1080, height: 1350 },
  "1080x1080": { width: 1080, height: 1080 },
  "800x800": { width: 800, height: 800 },
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
  const width = Math.min(Math.max(getNumberValue(controls.width, 300), 100), 3000);
  const height = Math.min(Math.max(getNumberValue(controls.height, 300), 100), 3000);
  const fontSize = Math.min(Math.max(getNumberValue(controls.fontSize, 40), 8), 180);
  const outputScale = Math.min(Math.max(getNumberValue(controls.outputScale, 2), 1), 4);
  const borderWidth = Math.min(Math.max(getNumberValue(controls.borderWidth, 4), 1), 80);

  return {
    fontFamily: controls.fontFamily.value,
    fontSize,
    backgroundColor: getHexColor(controls.backgroundColor, "#000000"),
    transparentBackground: controls.transparentBackground.checked,
    textColor: getHexColor(controls.textColor, "#fed002"),
    borderEnabled: controls.borderEnabled.checked,
    borderStyle: document.querySelector('input[name="border-style"]:checked')?.value || "solid",
    borderWidth,
    borderColor: getHexColor(controls.borderColor, "#fed002"),
    shape: document.querySelector('input[name="image-shape"]:checked')?.value || "square",
    textAlign: document.querySelector('input[name="text-align"]:checked')?.value || "center",
    width,
    height,
    outputScale,
    extension: controls.extension.value,
  };
}

function normalizeHexColor(value) {
  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split("")
      .map((char) => char + char)
      .join("")
      .toLowerCase()}`;
  }

  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed
      .split("")
      .map((char) => char + char)
      .join("")
      .toLowerCase()}`;
  }

  return "";
}

function getHexColor(input, fallback) {
  return normalizeHexColor(input.value) || fallback;
}

function commitHexInput(input, fallback) {
  input.value = getHexColor(input, fallback);
}

function getCheckedValue(name, fallback) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
}

function setCheckedValue(name, value) {
  const option = document.querySelector(`input[name="${name}"][value="${value}"]`);

  if (option) {
    option.checked = true;
  }
}

function getSettingsSnapshot() {
  return {
    editorHtml: controls.editor.innerHTML,
    filename: controls.filename.value,
    fontFamily: controls.fontFamily.value,
    fontSize: controls.fontSize.value,
    backgroundColor: controls.backgroundColor.value,
    transparentBackground: controls.transparentBackground.checked,
    textColor: controls.textColor.value,
    borderEnabled: controls.borderEnabled.checked,
    borderStyle: getCheckedValue("border-style", "solid"),
    borderWidth: controls.borderWidth.value,
    borderColor: controls.borderColor.value,
    shape: getCheckedValue("image-shape", "square"),
    textAlign: getCheckedValue("text-align", "center"),
    sizePreset: controls.sizePreset.value,
    outputScale: controls.outputScale.value,
    width: controls.width.value,
    height: controls.height.value,
    extension: controls.extension.value,
    theme: getCheckedValue("ui-theme", "dark"),
  };
}

function saveSettings() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(getSettingsSnapshot()));
  } catch {
    // localStorage can be unavailable in some privacy modes.
  }
}

function restoreSettings() {
  let saved;

  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch {
    return;
  }

  if (!saved || typeof saved !== "object") {
    return;
  }

  controls.editor.innerHTML = saved.editorHtml || defaultText;
  controls.filename.value = saved.filename || "";
  controls.fontFamily.value = saved.fontFamily || controls.fontFamily.value;
  controls.fontSize.value = saved.fontSize || controls.fontSize.value;
  controls.backgroundColor.value = saved.backgroundColor || controls.backgroundColor.value;
  controls.transparentBackground.checked = Boolean(saved.transparentBackground);
  controls.textColor.value = saved.textColor || controls.textColor.value;
  controls.borderEnabled.checked = Boolean(saved.borderEnabled);
  controls.borderWidth.value = saved.borderWidth || controls.borderWidth.value;
  controls.borderColor.value = saved.borderColor || controls.borderColor.value;
  controls.sizePreset.value = saved.sizePreset || controls.sizePreset.value;
  controls.outputScale.value = saved.outputScale || controls.outputScale.value;
  controls.width.value = saved.width || controls.width.value;
  controls.height.value = saved.height || controls.height.value;
  controls.extension.value = saved.extension || controls.extension.value;

  setCheckedValue("border-style", saved.borderStyle || "solid");
  setCheckedValue("image-shape", saved.shape || "square");
  setCheckedValue("text-align", saved.textAlign || "center");
  setCheckedValue("ui-theme", saved.theme || "dark");
}

function getFont(state, run) {
  const weight = run.bold ? "900" : "500";
  return `${weight} ${state.fontSize}px ${state.fontFamily}`;
}

function getDownloadBaseName() {
  const normalized = controls.filename.value.trim().replace(/[\\/:*?"<>|]+/g, "-");
  return normalized || "TTI";
}

function isBlockElement(element) {
  return ["DIV", "P", "SECTION", "ARTICLE", "LI", "H1", "H2", "H3", "H4", "H5", "H6"].includes(element.tagName);
}

function getElementFormat(element, inherited) {
  const style = window.getComputedStyle(element);
  const tagName = element.tagName;
  const fontWeight = Number.parseInt(style.fontWeight, 10);
  const textDecoration = style.textDecorationLine || style.textDecoration || "";

  return {
    bold: inherited.bold || tagName === "B" || tagName === "STRONG" || fontWeight >= 600,
    underline: inherited.underline || tagName === "U" || textDecoration.includes("underline"),
    strike:
      inherited.strike ||
      tagName === "S" ||
      tagName === "STRIKE" ||
      tagName === "DEL" ||
      textDecoration.includes("line-through"),
  };
}

function pushTextRuns(runs, text, format) {
  Array.from(text).forEach((char) => {
    runs.push({ text: char, bold: format.bold, underline: format.underline, strike: format.strike });
  });
}

function pushNewline(runs, format = { bold: false, underline: false, strike: false }) {
  runs.push({ text: "\n", bold: format.bold, underline: format.underline, strike: format.strike });
}

function collectRuns(node, inherited, runs) {
  if (node.nodeType === Node.TEXT_NODE) {
    pushTextRuns(runs, node.textContent || "", inherited);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  if (node.tagName === "BR") {
    pushNewline(runs, inherited);
    return;
  }

  const nextFormat = getElementFormat(node, inherited);
  const startsLength = runs.length;
  const isNestedBlock = node !== controls.editor && isBlockElement(node);

  if (isNestedBlock && startsLength > 0 && runs[runs.length - 1].text !== "\n") {
    pushNewline(runs, nextFormat);
  }

  Array.from(node.childNodes).forEach((child) => collectRuns(child, nextFormat, runs));

  if (isNestedBlock && runs.length > startsLength && runs[runs.length - 1].text !== "\n") {
    pushNewline(runs, nextFormat);
  }
}

function getEditorRuns() {
  const runs = [];
  collectRuns(controls.editor, { bold: false, underline: false, strike: false }, runs);

  while (runs.length && runs[runs.length - 1].text === "\n") {
    runs.pop();
  }

  const hasText = runs.some((run) => run.text.trim());

  if (!hasText) {
    return Array.from(defaultText).map((char) => ({
      text: char,
      bold: false,
      underline: false,
      strike: false,
    }));
  }

  return runs;
}

function measureRun(run, state) {
  ctx.font = getFont(state, run);
  return ctx.measureText(run.text).width;
}

function wrapRuns(runs, maxWidth, state) {
  const lines = [[]];
  let currentWidth = 0;

  runs.forEach((run) => {
    if (run.text === "\n") {
      lines.push([]);
      currentWidth = 0;
      return;
    }

    const width = measureRun(run, state);

    if (currentWidth + width > maxWidth && lines[lines.length - 1].length > 0) {
      lines.push([]);
      currentWidth = 0;
    }

    lines[lines.length - 1].push({ ...run, width });
    currentWidth += width;
  });

  return lines.length > 0 ? lines : [[]];
}

function getLineWidth(line) {
  return line.reduce((sum, run) => sum + run.width, 0);
}

function getLineStartX(line, state, maxTextWidth, padding) {
  const lineWidth = getLineWidth(line);

  if (state.textAlign === "left") {
    return padding;
  }

  if (state.textAlign === "right") {
    return padding + maxTextWidth - lineWidth;
  }

  return state.width / 2 - lineWidth / 2;
}

function drawDecoration(startX, endX, baselineY, lineHeight, run, state) {
  if (!run.underline && !run.strike) {
    return;
  }

  const lineWidth = Math.max(1, Math.round(state.fontSize / 18));

  ctx.save();
  ctx.strokeStyle = state.textColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  if (run.underline) {
    const y = baselineY + lineHeight * 0.16;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }

  if (run.strike) {
    const y = baselineY - lineHeight * 0.32;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }

  ctx.restore();
}

function addRoundedRectPath(x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
}

function addShapePath(state, inset = 0) {
  const x = inset;
  const y = inset;
  const width = Math.max(0, state.width - inset * 2);
  const height = Math.max(0, state.height - inset * 2);
  const centerX = state.width / 2;
  const centerY = state.height / 2;

  ctx.beginPath();

  if (state.shape === "circle") {
    const radius = Math.max(0, Math.min(width, height) / 2);
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    return;
  }

  if (state.shape === "rounded") {
    addRoundedRectPath(x, y, width, height, Math.min(width, height) * 0.14);
    return;
  }

  if (state.shape === "pill") {
    addRoundedRectPath(x, y, width, height, Math.min(width, height) / 2);
    return;
  }

  if (state.shape === "diamond") {
    ctx.moveTo(centerX, y);
    ctx.lineTo(x + width, centerY);
    ctx.lineTo(centerX, y + height);
    ctx.lineTo(x, centerY);
    ctx.closePath();
    return;
  }

  ctx.rect(x, y, width, height);
}

function getBorderDash(state) {
  if (state.borderStyle === "dashed") {
    return [state.borderWidth * 3, state.borderWidth * 2];
  }

  if (state.borderStyle === "dotted") {
    return [state.borderWidth, state.borderWidth * 1.8];
  }

  return [];
}

function drawBorder(state) {
  if (!state.borderEnabled) {
    return;
  }

  const offset = state.borderWidth / 2;

  ctx.save();
  ctx.strokeStyle = state.borderColor;
  ctx.lineWidth = state.borderWidth;
  ctx.setLineDash(getBorderDash(state));
  ctx.lineCap = state.borderStyle === "dotted" ? "round" : "butt";
  addShapePath(state, offset);
  ctx.stroke();
  ctx.restore();
}

function renderThumbnail() {
  const state = getState();
  const renderWidth = state.width * state.outputScale;
  const renderHeight = state.height * state.outputScale;

  canvas.width = renderWidth;
  canvas.height = renderHeight;
  canvas.style.width = `${state.width}px`;
  canvas.style.height = "auto";
  previewSize.textContent = `${state.width} x ${state.height} @ ${state.outputScale}x`;

  ctx.setTransform(state.outputScale, 0, 0, state.outputScale, 0, 0);
  ctx.clearRect(0, 0, state.width, state.height);

  if (state.extension === "jpg" && state.shape !== "square") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, state.width, state.height);
  }

  ctx.save();
  addShapePath(state);
  ctx.clip();

  if (!state.transparentBackground || state.extension === "jpg") {
    ctx.fillStyle = state.transparentBackground ? "#ffffff" : state.backgroundColor;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  const padding = Math.max(12, Math.round(Math.min(state.width, state.height) * 0.08));
  const maxTextWidth = Math.max(40, state.width - padding * 2);
  const lineHeight = Math.round(state.fontSize * 1.28);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = state.textColor;

  const lines = wrapRuns(getEditorRuns(), maxTextWidth, state);
  const totalHeight = lines.length * lineHeight;
  const firstBaseline = state.height / 2 - totalHeight / 2 + lineHeight * 0.72;

  lines.forEach((line, lineIndex) => {
    let x = getLineStartX(line, state, maxTextWidth, padding);
    const y = firstBaseline + lineIndex * lineHeight;

    line.forEach((run) => {
      ctx.font = getFont(state, run);
      ctx.fillStyle = state.textColor;
      ctx.fillText(run.text, x, y);
      drawDecoration(x, x + run.width, y, lineHeight, run, state);
      x += run.width;
    });
  });

  ctx.restore();
  drawBorder(state);
  saveSettings();
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

styleButtons.forEach((button) => {
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  button.addEventListener("click", () => {
    applySelectedStyle(button.dataset.command);
    renderThumbnail();
  });
});

function getStyleTag(command) {
  return {
    bold: "strong",
    underline: "u",
    strikeThrough: "s",
  }[command];
}

function findStyledAncestor(node, tagName) {
  const start = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

  if (!start) {
    return null;
  }

  return start.closest(tagName);
}

function unwrapElement(element) {
  const parent = element.parentNode;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

function applySelectedStyle(command) {
  const tagName = getStyleTag(command);
  const selection = window.getSelection();

  if (!tagName || !selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);

  if (!controls.editor.contains(range.commonAncestorContainer) || range.collapsed) {
    controls.editor.focus();
    return;
  }

  const existing =
    findStyledAncestor(range.startContainer, tagName) &&
    findStyledAncestor(range.endContainer, tagName);

  if (existing) {
    unwrapElement(findStyledAncestor(range.startContainer, tagName));
    controls.editor.focus();
    return;
  }

  const wrapper = document.createElement(tagName);
  wrapper.appendChild(range.extractContents());
  range.insertNode(wrapper);

  selection.removeAllRanges();
  const nextRange = document.createRange();
  nextRange.selectNodeContents(wrapper);
  selection.addRange(nextRange);
  controls.editor.focus();
}

[
  controls.editor,
  controls.filename,
  controls.fontFamily,
  controls.fontSize,
  controls.backgroundColor,
  controls.transparentBackground,
  controls.textColor,
  controls.borderEnabled,
  controls.borderWidth,
  controls.borderColor,
  controls.outputScale,
  controls.extension,
  ...textAlignOptions,
  ...shapeOptions,
  ...borderStyleOptions,
].forEach((element) => {
  element.addEventListener("input", renderThumbnail);
  element.addEventListener("change", renderThumbnail);
});

controls.transparentBackground.addEventListener("change", () => {
  controls.backgroundColor.disabled = controls.transparentBackground.checked;
  backgroundColorGroup.classList.toggle("is-disabled", controls.transparentBackground.checked);
  renderThumbnail();
});

controls.borderEnabled.addEventListener("change", () => {
  borderOptions.classList.toggle("is-active", controls.borderEnabled.checked);
  renderThumbnail();
});

themeOptions.forEach((option) => {
  option.addEventListener("change", () => {
    document.body.dataset.theme = document.querySelector('input[name="ui-theme"]:checked')?.value || "dark";
    saveSettings();
  });
});

swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    const target = document.getElementById(swatch.dataset.colorTarget);

    if (!target || target.disabled) {
      return;
    }

    target.value = swatch.dataset.color;
    renderThumbnail();
  });
});

[
  [controls.backgroundColor, "#000000"],
  [controls.textColor, "#fed002"],
  [controls.borderColor, "#fed002"],
].forEach(([input, fallback]) => {
  input.addEventListener("blur", () => {
    commitHexInput(input, fallback);
    renderThumbnail();
  });
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
restoreSettings();
syncPresetSize();
controls.backgroundColor.disabled = controls.transparentBackground.checked;
backgroundColorGroup.classList.toggle("is-disabled", controls.transparentBackground.checked);
borderOptions.classList.toggle("is-active", controls.borderEnabled.checked);
document.body.dataset.theme = document.querySelector('input[name="ui-theme"]:checked')?.value || "dark";
renderThumbnail();
