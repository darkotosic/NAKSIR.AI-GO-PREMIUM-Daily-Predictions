import { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';

export type ConsentResult = {
  canRequestAds: boolean;
  status: AdsConsentStatus;
};

export async function initConsent(): Promise<ConsentResult> {
  // Request latest consent info on every app start
  const info = await AdsConsent.requestInfoUpdate();

  // If a form is available, gatherConsent will load + show it if required
  // (and returns updated info)
  let finalInfo = info;
  if (info.isConsentFormAvailable) {
    finalInfo = await AdsConsent.gatherConsent();
  }

  return {
    canRequestAds: Boolean(finalInfo.canRequestAds),
    status: finalInfo.status,
  };
}

export async function openPrivacyOptions(): Promise<void> {
  await AdsConsent.showPrivacyOptionsForm();
}
