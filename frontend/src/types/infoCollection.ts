export type CommunicationStyle = 'direct' | 'gentle' | 'informational';
export type CheckInFrequency = 'daily' | 'weekly' | 'as_needed';

export interface InfoCollectionPreferences {
  communicationStyle: CommunicationStyle;
  checkInFrequency: CheckInFrequency;
  wantsReminders: boolean;
}

export interface InfoCollectionPayload {
  name: string;
  email: string;
  preferences: InfoCollectionPreferences;
}

export interface InfoCollectionResponse {
  success: boolean;
  message?: string;
  id?: string;
}
