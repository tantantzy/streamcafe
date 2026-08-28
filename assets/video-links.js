export function extractGoogleDriveFileId(url = "") {
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/?#]+)/i,
    /drive\.google\.com\/open\?id=([^&#]+)/i,
    /drive\.google\.com\/uc\?(?:.*&)?id=([^&#]+)/i,
    /[?&]id=([^&#]+)/i
  ];

  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function normalizeVideoUrl(url = "") {
  const trimmed = url.trim();
  const id = extractGoogleDriveFileId(trimmed);

  if (id) {
    return {
      type: "google-drive",
      // Prefer Google's downloadable media endpoint so the browser's native
      // HTML5 controls are used. This places the seek/progress control at
      // the bottom of the player instead of inside the Drive preview iframe.
      embedUrl: `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,
      fallbackEmbedUrl: `https://drive.google.com/file/d/${id}/preview`,
      externalUrl: `https://drive.google.com/file/d/${id}/view`
    };
  }

  return {
    type: "direct",
    embedUrl: trimmed,
    externalUrl: trimmed
  };
}
