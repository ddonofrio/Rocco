export interface TrackedContentFailure {
  filePath: string;
  lineNumber: number;
  ruleId: string;
  message: string;
}

export function scanText(filePath: string, fileBuffer: Uint8Array): TrackedContentFailure[];
