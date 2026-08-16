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
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      externalUrl: `https://drive.google.com/file/d/${id}/view`
    };
  }

  return {
    type: "direct",
    embedUrl: trimmed,
    externalUrl: trimmed
  };
}
