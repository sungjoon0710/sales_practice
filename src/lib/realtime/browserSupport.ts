import { logger } from "./logger";

export interface BrowserSupportResult {
  supported: boolean;
  error?: string;
  details: {
    secureContext: boolean;
    mediaDevices: boolean;
    getUserMedia: boolean;
    audioContext: boolean;
    webSocket: boolean;
  };
}

/**
 * Check if the browser supports all required APIs for realtime audio
 */
export function checkBrowserSupport(): BrowserSupportResult {
  logger.info("Checking browser support...");

  const details = {
    secureContext: false,
    mediaDevices: false,
    getUserMedia: false,
    audioContext: false,
    webSocket: false,
  };

  // Check for secure context (HTTPS or localhost)
  if (typeof window !== "undefined") {
    details.secureContext = window.isSecureContext;
    if (!details.secureContext) {
      logger.error("Not in a secure context (HTTPS required)");
      return {
        supported: false,
        error: "Microphone requires HTTPS. Please use localhost or HTTPS.",
        details,
      };
    }
  }
  logger.info("✓ Secure context");

  // Check for navigator.mediaDevices
  if (typeof navigator === "undefined") {
    logger.error("Navigator not available");
    return {
      supported: false,
      error: "Browser not supported (no navigator)",
      details,
    };
  }

  if (navigator.mediaDevices) {
    details.mediaDevices = true;
    logger.info("✓ MediaDevices API available");
  } else {
    logger.error("navigator.mediaDevices not available");
    return {
      supported: false,
      error: "MediaDevices API not available. Ensure you're using HTTPS or localhost.",
      details,
    };
  }

  // Check for getUserMedia
  if (navigator.mediaDevices.getUserMedia) {
    details.getUserMedia = true;
    logger.info("✓ getUserMedia available");
  } else {
    logger.error("getUserMedia not available");
    return {
      supported: false,
      error: "getUserMedia not supported in this browser",
      details,
    };
  }

  // Check for AudioContext
  if (typeof AudioContext !== "undefined") {
    details.audioContext = true;
    logger.info("✓ AudioContext available");
  } else {
    logger.error("AudioContext not available");
    return {
      supported: false,
      error: "AudioContext not supported in this browser",
      details,
    };
  }

  // Check for WebSocket
  if (typeof WebSocket !== "undefined") {
    details.webSocket = true;
    logger.info("✓ WebSocket available");
  } else {
    logger.error("WebSocket not available");
    return {
      supported: false,
      error: "WebSocket not supported in this browser",
      details,
    };
  }

  logger.info("All browser checks passed");
  return { supported: true, details };
}

/**
 * Check if microphone permission has been granted
 */
export async function checkMicrophonePermission(): Promise<PermissionState | "unknown"> {
  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      return result.state;
    }
  } catch {
    // permissions.query might not support microphone in all browsers
  }
  return "unknown";
}
