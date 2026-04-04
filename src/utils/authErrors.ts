/**
 * Translation mapping for Supabase auth error messages (English → French)
 */
const errorTranslations: Record<string, string> = {
  'Invalid login credentials': 'Identifiants incorrects',
  'User already registered': 'Un compte existe déjà avec cet email',
  'Email not confirmed': 'Veuillez confirmer votre email',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
  'Email address is invalid': 'Adresse email invalide',
  'Signup requires a valid password': 'Un mot de passe valide est requis',
  'Email rate limit exceeded': 'Trop de tentatives. Veuillez réessayer plus tard',
  'For security purposes, you can only request this after': 'Pour des raisons de sécurité, veuillez réessayer plus tard',
  'User not found': 'Utilisateur non trouvé',
  'New password should be different from the old password': 'Le nouveau mot de passe doit être différent de l\'ancien',
};

export function translateAuthError(message: string): string {
  // Exact match
  if (errorTranslations[message]) {
    return errorTranslations[message];
  }

  // Partial match (some Supabase errors include dynamic content)
  for (const [key, value] of Object.entries(errorTranslations)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Default fallback
  return 'Une erreur est survenue. Veuillez réessayer.';
}
