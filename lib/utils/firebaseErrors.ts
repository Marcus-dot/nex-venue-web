export function getCleanErrorMessage(err: unknown, defaultMessage: string = "An unexpected error occurred. Please try again."): string {
    const e = err as { code?: string; message?: string } | null | undefined;
    const code = e?.code || "";
    const message = e?.message || "";
    const str = `${code} ${message}`.toLowerCase();

    // Email / Password Errors
    if (str.includes("auth/email-already-in-use")) return "This email is already registered. Please log in instead.";
    if (str.includes("auth/invalid-credential") || str.includes("auth/wrong-password") || str.includes("auth/user-not-found")) return "Incorrect email or password.";
    if (str.includes("auth/weak-password")) return "Password is too weak. Please use at least 6 characters.";
    if (str.includes("auth/invalid-email")) return "Please enter a valid email address.";
    if (str.includes("auth/too-many-requests")) return "Too many failed attempts. Please try again later.";
    
    // Phone / OTP Errors
    if (str.includes("auth/invalid-verification-code")) return "Invalid verification code. Please check the SMS and try again.";
    if (str.includes("auth/invalid-phone-number")) return "Invalid phone number. Ensure it includes the country code (e.g. +27).";
    if (str.includes("auth/code-expired")) return "The SMS code has expired. Please request a new one.";
    if (str.includes("auth/captcha-check-failed")) return "reCAPTCHA verification failed. Please reload and try again.";
    if (str.includes("auth/missing-phone-number")) return "Please enter your phone number.";
    if (str.includes("auth/quota-exceeded")) return "SMS limit reached for now. Please try again later or use Google sign-in.";

    // Connectivity
    if (str.includes("auth/network-request-failed") || str.includes("network")) return "Network error. Check your connection and try again.";

    return defaultMessage;
}
