/**
 * Analyzes audio buffers to detect silence regions for intelligent mixing
 */
export interface SilenceRegion {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface AudioAnalysisResult {
  duration: number;
  silenceRegions: SilenceRegion[];
  audioSegments: Array<{ start: number; end: number }>;
}

export class AudioAnalyzer {
  /**
   * Analyzes an audio buffer to find silence regions
   */
  static analyzeBuffer(
    buffer: AudioBuffer,
    silenceThreshold = 0.01,
    minSilenceDurationMs = 200,
  ): AudioAnalysisResult {
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0); // Analyze first channel
    const duration = buffer.duration;
    
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
    const minSilenceSamples = Math.floor((minSilenceDurationMs / 1000) * sampleRate);
    
    const silenceRegions: SilenceRegion[] = [];
    let silenceStart: number | undefined;
    let silenceSampleCount = 0;
    
    // Scan through audio in windows
    for (let index = 0; index < channelData.length; index += windowSize) {
      const windowEnd = Math.min(index + windowSize, channelData.length);
      const rms = this.calculateRMS(channelData, index, windowEnd);
      
      const isSilent = rms < silenceThreshold;
      
      if (isSilent) {
        if (silenceStart === undefined) {
          silenceStart = index / sampleRate;
        }
        silenceSampleCount += windowEnd - index;
      } else {
        if (silenceStart !== undefined && silenceSampleCount >= minSilenceSamples) {
          const silenceEnd = index / sampleRate;
          silenceRegions.push({
            startTime: silenceStart,
            endTime: silenceEnd,
            duration: silenceEnd - silenceStart,
          });
        }
        silenceStart = undefined;
        silenceSampleCount = 0;
      }
    }
    
    // Handle trailing silence
    if (silenceStart !== undefined && silenceSampleCount >= minSilenceSamples) {
      silenceRegions.push({
        startTime: silenceStart,
        endTime: duration,
        duration: duration - silenceStart,
      });
    }
    
    // Build audio segments (non-silence regions)
    const audioSegments = this.buildAudioSegments(duration, silenceRegions);
    
    return {
      duration,
      silenceRegions,
      audioSegments,
    };
  }
  
  private static calculateRMS(data: Float32Array, start: number, end: number): number {
    let sumSquares = 0;
    let count = 0;
    
    for (let index = start; index < end; index++) {
      sumSquares += data[index] * data[index];
      count++;
    }
    
    return count > 0 ? Math.sqrt(sumSquares / count) : 0;
  }
  
  private static buildAudioSegments(
    duration: number,
    silenceRegions: SilenceRegion[],
  ): Array<{ start: number; end: number }> {
    if (silenceRegions.length === 0) {
      return [{ start: 0, end: duration }];
    }
    
    const segments: Array<{ start: number; end: number }> = [];
    let currentStart = 0;
    
    for (const silence of silenceRegions) {
      if (silence.startTime > currentStart) {
        segments.push({ start: currentStart, end: silence.startTime });
      }
      currentStart = silence.endTime;
    }
    
    // Add final segment if there's audio after last silence
    if (currentStart < duration) {
      segments.push({ start: currentStart, end: duration });
    }
    
    return segments;
  }
}
