import { initializeApp } from 'firebase/app';
import { getAuth, PhoneAuthProvider, signInWithCredential, RecaptchaVerifier } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'burguersoft-f5634.firebaseapp.com',
  projectId: 'burguersoft-f5634',
  storageBucket: 'burguersoft-f5634.firebasestorage.app',
  messagingSenderId: '224286061826',
  appId: '1:224286061826:web:22ddf669f94b053eb1be1b',
  measurementId: 'G-17JSFM33ML',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function getRecaptchaVerifier(): RecaptchaVerifier {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
  }
  return recaptchaVerifier;
}

let confirmationResult: { verificationId: string } | null = null;

export function setConfirmationResult(result: { verificationId: string }) {
  confirmationResult = result;
}

export async function verifyPhoneCode(code: string): Promise<string> {
  if (!confirmationResult) {
    throw new Error('No hay una verificación pendiente');
  }
  const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, code);
  const userCredential = await signInWithCredential(auth, credential);
  const idToken = await userCredential.user.getIdToken();
  return idToken;
}
